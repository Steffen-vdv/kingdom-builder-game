import { Land, Stat } from '../state';
import type { PlayerState, StatKey, ResourceKey } from '../state';
import type { RuleSet } from '../services';
import { applyStatDelta } from '../stat_sources';
import type { RuntimeResourceCatalog } from '../resource-v2';
import {
	ensureBoundFlags,
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

interface ApplyPlayerStartConfigurationOptions {
	resourceCatalog?: RuntimeResourceCatalog;
	initialiseResources?: boolean;
}

export function applyPlayerStartConfiguration(
	playerState: PlayerState,
	config: PlayerStartConfig,
	rules: RuleSet,
	options: ApplyPlayerStartConfigurationOptions = {},
): void {
	const { resourceCatalog, initialiseResources = false } = options;
	if (resourceCatalog && initialiseResources) {
		initialisePlayerResourceState(playerState, resourceCatalog);
	}
	const statKeys = Object.keys(playerState.stats);
	const previousStatValues: Record<string, number> = {};
	for (const statKey of statKeys) {
		previousStatValues[statKey] = playerState.stats[statKey] ?? 0;
	}
	if (resourceCatalog) {
		const valuesV2Entries = Object.entries(config.valuesV2 || {});
		for (const [resourceId, rawValue] of valuesV2Entries) {
			const value = rawValue ?? 0;
			setResourceValue(null, playerState, resourceCatalog, resourceId, value, {
				suppressTouched: true,
				suppressRecentEntry: true,
			});
		}
		const lowerBoundsEntries = Object.entries(
			config.resourceLowerBoundsV2 || {},
		);
		for (const [resourceId, rawBound] of lowerBoundsEntries) {
			if (typeof rawBound !== 'number') {
				continue;
			}
			playerState.resourceLowerBounds[resourceId] = rawBound;
			const flags = ensureBoundFlags(playerState, resourceId);
			flags.lower = true;
			const currentValue = playerState.resourceValues[resourceId];
			if (typeof currentValue === 'number' && currentValue < rawBound) {
				setResourceValue(
					null,
					playerState,
					resourceCatalog,
					resourceId,
					rawBound,
					{
						suppressTouched: true,
						suppressRecentEntry: true,
					},
				);
			}
		}
		const upperBoundsEntries = Object.entries(
			config.resourceUpperBoundsV2 || {},
		);
		for (const [resourceId, rawBound] of upperBoundsEntries) {
			if (typeof rawBound !== 'number') {
				continue;
			}
			playerState.resourceUpperBounds[resourceId] = rawBound;
			const flags = ensureBoundFlags(playerState, resourceId);
			flags.upper = true;
			const currentValue = playerState.resourceValues[resourceId];
			if (typeof currentValue === 'number' && currentValue > rawBound) {
				setResourceValue(
					null,
					playerState,
					resourceCatalog,
					resourceId,
					rawBound,
					{
						suppressTouched: true,
						suppressRecentEntry: true,
					},
				);
			}
		}
	}
	const applyLegacyBags = !resourceCatalog || !config.valuesV2;
	if (applyLegacyBags) {
		for (const [resourceKey, value] of Object.entries(config.resources || {})) {
			playerState.resources[resourceKey] = value ?? 0;
		}
		for (const [statKey, value] of Object.entries(config.stats || {})) {
			if (!isStatKey(statKey)) {
				continue;
			}
			playerState.stats[statKey] = value ?? 0;
		}
		for (const [roleId, value] of Object.entries(config.population || {})) {
			playerState.population[roleId] = value ?? 0;
		}
	}
	for (const statKey of statKeys) {
		const previousValue = previousStatValues[statKey] ?? 0;
		const nextValue = playerState.stats[statKey] ?? 0;
		if (nextValue !== 0) {
			playerState.statsHistory[statKey] = true;
		}
		const delta = nextValue - previousValue;
		if (delta !== 0) {
			applyStatDelta(playerState, statKey, delta, START_STAT_SOURCE_META);
		}
	}
	if (!applyLegacyBags) {
		for (const [roleId, value] of Object.entries(config.population || {})) {
			if (value === undefined || value === null) {
				continue;
			}
			playerState.population[roleId] = value;
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
		const baseValue = baseConfig.resourceLowerBoundsV2?.[resourceId] ?? 0;
		const overrideValue = value ?? 0;
		if (overrideValue === baseValue) {
			continue;
		}
		diff.resourceLowerBoundsV2 = diff.resourceLowerBoundsV2 || {};
		diff.resourceLowerBoundsV2[resourceId] = overrideValue;
	}
	for (const [resourceId, value] of Object.entries(
		overrideConfig.resourceUpperBoundsV2 || {},
	)) {
		const baseValue = baseConfig.resourceUpperBoundsV2?.[resourceId] ?? 0;
		const overrideValue = value ?? 0;
		if (overrideValue === baseValue) {
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

export function determineCommonActionCostResource(
	actions: Registry<ActionDef>,
): ResourceKey {
	let intersection: string[] | null = null;
	for (const [, actionDefinition] of actions.entries()) {
		if (actionDefinition.system) {
			continue;
		}
		const costKeys = Object.keys(actionDefinition.baseCosts || {});
		if (!costKeys.length) {
			continue;
		}
		intersection = intersection
			? intersection.filter((key) => costKeys.includes(key))
			: costKeys;
	}
	if (intersection && intersection.length > 0) {
		return intersection[0] as ResourceKey;
	}
	return '' as ResourceKey;
}
