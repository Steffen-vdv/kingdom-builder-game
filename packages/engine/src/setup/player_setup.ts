import { Land } from '../state';
import type { PlayerState, StatKey } from '../state';
import { Stat } from '@kingdom-builder/contents';
import type { RuleSet } from '../services';
import { applyStatDelta } from '../stat_sources';
import type { RuntimeResourceCatalog } from '../resource-v2';
import {
	initialisePlayerResourceState,
	setResourceValue,
} from '../resource-v2';
import type {
	ActionConfig as ActionDef,
	PlayerStartConfig,
	Registry,
} from '@kingdom-builder/protocol';
import { START_STAT_SOURCE_META } from './stat_source_meta';

function cloneEffectList<EffectType extends object>(
	effectList: EffectType[] | undefined,
): EffectType[] {
	if (!effectList) {
		return [];
	}
	return effectList.map((effect) => ({ ...effect }));
}

function isStatKey(key: string): key is StatKey {
	return key in Stat;
}

export function applyPlayerStartConfiguration(
	playerState: PlayerState,
	config: PlayerStartConfig,
	rules: RuleSet,
	resourceCatalog?: RuntimeResourceCatalog,
): void {
	if (resourceCatalog && Object.keys(playerState.resourceValues).length === 0) {
		initialisePlayerResourceState(playerState, resourceCatalog);
	}
	for (const [resourceKey, value] of Object.entries(config.resources || {})) {
		playerState.resources[resourceKey] = value ?? 0;
	}
	for (const [statKey, value] of Object.entries(config.stats || {})) {
		if (!isStatKey(statKey)) {
			continue;
		}
		const statValue = value ?? 0;
		const previousValue = playerState.stats[statKey] ?? 0;
		playerState.stats[statKey] = statValue;
		if (statValue !== 0) {
			playerState.statsHistory[statKey] = true;
		}
		const delta = statValue - previousValue;
		if (delta !== 0) {
			applyStatDelta(playerState, statKey, delta, START_STAT_SOURCE_META);
		}
	}
	for (const [roleId, value] of Object.entries(config.population || {})) {
		playerState.population[roleId] = value ?? 0;
	}
	const shouldSnapshotStats = Boolean(
		resourceCatalog &&
		(config.valuesV2 ||
			config.resourceLowerBoundsV2 ||
			config.resourceUpperBoundsV2),
	);
	let statSnapshotBeforeResourceOverrides: Map<StatKey, number> | null = null;
	if (shouldSnapshotStats) {
		statSnapshotBeforeResourceOverrides = new Map<StatKey, number>();
		for (const statKey of Object.keys(playerState.statsHistory)) {
			statSnapshotBeforeResourceOverrides.set(
				statKey,
				playerState.stats[statKey] ?? 0,
			);
		}
	}
	if (config.lands) {
		config.lands.forEach((landConfig, index) => {
			const land = new Land(
				`${playerState.id}-L${index + 1}`,
				landConfig.slotsMax ?? rules.slotsPerNewLand,
				landConfig.tilled ?? false,
			);
			if (landConfig.developments) {
				land.developments.push(...landConfig.developments);
			}
			land.slotsUsed = landConfig.slotsUsed ?? land.developments.length;
			if (landConfig.upkeep) {
				land.upkeep = { ...landConfig.upkeep };
			}
			const payUpkeepSteps = landConfig.onPayUpkeepStep;
			if (payUpkeepSteps) {
				land.onPayUpkeepStep = cloneEffectList(payUpkeepSteps);
			}
			const gainIncomeSteps = landConfig.onGainIncomeStep;
			if (gainIncomeSteps) {
				land.onGainIncomeStep = cloneEffectList(gainIncomeSteps);
			}
			const gainActionPointSteps = landConfig.onGainAPStep;
			if (gainActionPointSteps) {
				land.onGainAPStep = cloneEffectList(gainActionPointSteps);
			}
			playerState.lands.push(land);
		});
	}
	if (!resourceCatalog) {
		return;
	}
	const updatedBoundResourceIds = new Set<string>();
	for (const [resourceId, value] of Object.entries(
		config.resourceLowerBoundsV2 || {},
	)) {
		const resolvedValue = value ?? 0;
		playerState.resourceLowerBounds[resourceId] = resolvedValue;
		updatedBoundResourceIds.add(resourceId);
	}
	for (const [resourceId, value] of Object.entries(
		config.resourceUpperBoundsV2 || {},
	)) {
		const resolvedValue = value ?? 0;
		playerState.resourceUpperBounds[resourceId] = resolvedValue;
		updatedBoundResourceIds.add(resourceId);
	}
	if (updatedBoundResourceIds.size > 0) {
		for (const resourceId of updatedBoundResourceIds) {
			const currentValue = playerState.resourceValues[resourceId] ?? 0;
			setResourceValue(
				null,
				playerState,
				resourceCatalog,
				resourceId,
				currentValue,
				{
					suppressTouched: true,
					suppressRecentEntry: true,
				},
			);
		}
	}
	if (config.valuesV2) {
		for (const [resourceId, value] of Object.entries(config.valuesV2)) {
			const resolvedValue = value ?? 0;
			setResourceValue(
				null,
				playerState,
				resourceCatalog,
				resourceId,
				resolvedValue,
				{
					suppressTouched: true,
					suppressRecentEntry: true,
				},
			);
		}
	}
	if (statSnapshotBeforeResourceOverrides) {
		for (const [
			statKey,
			previousValue,
		] of statSnapshotBeforeResourceOverrides) {
			const nextValue = playerState.stats[statKey] ?? 0;
			if (nextValue !== 0) {
				playerState.statsHistory[statKey] = true;
			}
			const delta = nextValue - previousValue;
			if (delta !== 0) {
				applyStatDelta(playerState, statKey, delta, START_STAT_SOURCE_META);
			}
		}
	}
}

export function diffPlayerStartConfiguration(
	baseConfig: PlayerStartConfig,
	overrideConfig: PlayerStartConfig | undefined,
): PlayerStartConfig {
	const diff: PlayerStartConfig = {};
	if (!overrideConfig) {
		return diff;
	}
	for (const [resourceKey, value] of Object.entries(
		overrideConfig.resources || {},
	)) {
		const baseValue = baseConfig.resources?.[resourceKey] ?? 0;
		const overrideValue = value ?? 0;
		if (overrideValue === baseValue) {
			continue;
		}
		diff.resources = diff.resources || {};
		diff.resources[resourceKey] = overrideValue;
	}
	for (const [statKey, value] of Object.entries(overrideConfig.stats || {})) {
		const baseValue = baseConfig.stats?.[statKey] ?? 0;
		const overrideValue = value ?? 0;
		if (overrideValue === baseValue) {
			continue;
		}
		diff.stats = diff.stats || {};
		diff.stats[statKey] = overrideValue;
	}
	for (const [resourceId, value] of Object.entries(
		overrideConfig.valuesV2 || {},
	)) {
		const baseValue = baseConfig.valuesV2?.[resourceId] ?? 0;
		const overrideValue = value ?? 0;
		if (overrideValue === baseValue) {
			continue;
		}
		diff.valuesV2 = diff.valuesV2 || {};
		diff.valuesV2[resourceId] = overrideValue;
	}
	for (const [resourceId, value] of Object.entries(
		overrideConfig.resourceLowerBoundsV2 || {},
	)) {
		const baseHasValue = Object.prototype.hasOwnProperty.call(
			baseConfig.resourceLowerBoundsV2 || {},
			resourceId,
		);
		const baseValue = baseHasValue
			? (baseConfig.resourceLowerBoundsV2?.[resourceId] ?? 0)
			: 0;
		const overrideValue = value ?? 0;
		if (baseHasValue && overrideValue === baseValue) {
			continue;
		}
		diff.resourceLowerBoundsV2 = diff.resourceLowerBoundsV2 || {};
		diff.resourceLowerBoundsV2[resourceId] = overrideValue;
	}
	for (const [resourceId, value] of Object.entries(
		overrideConfig.resourceUpperBoundsV2 || {},
	)) {
		const baseHasValue = Object.prototype.hasOwnProperty.call(
			baseConfig.resourceUpperBoundsV2 || {},
			resourceId,
		);
		const baseValue = baseHasValue
			? (baseConfig.resourceUpperBoundsV2?.[resourceId] ?? 0)
			: 0;
		const overrideValue = value ?? 0;
		if (baseHasValue && overrideValue === baseValue) {
			continue;
		}
		diff.resourceUpperBoundsV2 = diff.resourceUpperBoundsV2 || {};
		diff.resourceUpperBoundsV2[resourceId] = overrideValue;
	}
	return diff;
}

export function initializePlayerActions(
	playerState: PlayerState,
	actions: Registry<ActionDef>,
): void {
	for (const [actionId, actionDefinition] of actions.entries()) {
		if (actionDefinition.system) {
			continue;
		}
		const id = actionDefinition.id ?? actionId;
		if (!id) {
			continue;
		}
		playerState.actions.add(id);
	}
}

export type { ActionCostConfiguration } from './action_cost_resolver';
export { determineCommonActionCostResource } from './action_cost_resolver';
