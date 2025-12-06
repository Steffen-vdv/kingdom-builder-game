import { Land } from '../state';
import type { PlayerState, ResourceKey } from '../state';
import type { RuleSet } from '../services';
import { applyResourceDelta } from '../resource_sources';
import type { RuntimeResourceCatalog } from '../resource-v2';
import {
	getResourceValue,
	initialisePlayerResourceState,
	setResourceValue,
} from '../resource-v2';
import type {
	ActionConfig as ActionDef,
	PlayerStartConfig,
	Registry,
} from '@kingdom-builder/protocol';
import { START_RESOURCE_SOURCE_META } from './resource_source_meta';

function cloneEffectList<EffectType extends object>(
	effectList: EffectType[] | undefined,
): EffectType[] {
	if (!effectList) {
		return [];
	}
	return effectList.map((effect) => ({ ...effect }));
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
	// Apply resources via ResourceV2 API (keys are now ResourceV2 IDs)
	if (resourceCatalog) {
		for (const [resourceId, value] of Object.entries(config.resources || {})) {
			setResourceValue(
				null,
				playerState,
				resourceCatalog,
				resourceId,
				value ?? 0,
				{
					suppressTouched: true,
					suppressRecentEntry: true,
				},
			);
		}
		// Apply stats via ResourceV2 API (stat keys are now ResourceV2 IDs)
		for (const [statId, value] of Object.entries(config.stats || {})) {
			const statValue = value ?? 0;
			const previousValue = playerState.resourceValues[statId] ?? 0;
			setResourceValue(null, playerState, resourceCatalog, statId, statValue, {
				suppressTouched: true,
				suppressRecentEntry: true,
			});
			const delta = statValue - previousValue;
			if (delta !== 0) {
				applyResourceDelta(
					playerState,
					statId,
					delta,
					START_RESOURCE_SOURCE_META,
				);
			}
		}
		// Apply population via ResourceV2 API (role IDs are now ResourceV2 IDs)
		for (const [roleId, value] of Object.entries(config.population || {})) {
			setResourceValue(null, playerState, resourceCatalog, roleId, value ?? 0, {
				suppressTouched: true,
				suppressRecentEntry: true,
			});
		}
	}
	const shouldSnapshotStats = Boolean(
		resourceCatalog &&
		(config.valuesV2 ||
			config.resourceLowerBoundsV2 ||
			config.resourceUpperBoundsV2),
	);
	let resourceSnapshotBeforeOverrides: Map<ResourceKey, number> | null = null;
	if (shouldSnapshotStats) {
		resourceSnapshotBeforeOverrides = new Map<ResourceKey, number>();
		for (const resourceKey of Object.keys(playerState.resourceTouched)) {
			resourceSnapshotBeforeOverrides.set(
				resourceKey,
				getResourceValue(playerState, resourceKey),
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
	if (resourceSnapshotBeforeOverrides) {
		for (const [
			resourceKey,
			previousValue,
		] of resourceSnapshotBeforeOverrides) {
			const nextValue = getResourceValue(playerState, resourceKey);
			if (nextValue !== 0) {
				playerState.resourceTouched[resourceKey] = true;
			}
			const delta = nextValue - previousValue;
			if (delta !== 0) {
				applyResourceDelta(
					playerState,
					resourceKey,
					delta,
					START_RESOURCE_SOURCE_META,
				);
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
