import { Land, Stat } from '../state';
import type { PlayerState, StatKey, ResourceKey } from '../state';
import type { RuleSet } from '../services';
import { applyStatDelta } from '../stat_sources';
import type { ResourceV2EngineRegistry } from '../resourceV2/registry';
import type {
	ActionConfig as ActionDef,
	PlayerStartConfig,
	Registry,
} from '@kingdom-builder/protocol';
import { START_STAT_SOURCE_META } from './stat_source_meta';

interface PlayerStartResourceV2Config extends PlayerStartConfig {
	resourceV2?: Record<string, number | undefined>;
}

function getPlayerStartResourceV2Config(
	config: PlayerStartConfig,
): Record<string, number | undefined> | undefined {
	const candidate = (config as PlayerStartResourceV2Config).resourceV2;
	if (!candidate) {
		return undefined;
	}
	return candidate;
}

function clampToBounds(
	value: number,
	bounds: PlayerState['resourceV2']['bounds'][string] | undefined,
): number {
	const minimum = bounds?.lowerBound;
	const maximum = bounds?.upperBound;
	let result = value;
	if (minimum !== undefined && result < minimum) {
		result = minimum;
	}
	if (maximum !== undefined && result > maximum) {
		result = maximum;
	}
	return result;
}

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
): void {
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

	const resourceV2Config = getPlayerStartResourceV2Config(config);
	if (resourceV2Config) {
		const { resourceV2 } = playerState;
		for (const [resourceId, rawValue] of Object.entries(resourceV2Config)) {
			const hasAmount = Object.prototype.hasOwnProperty.call(
				resourceV2.amounts,
				resourceId,
			);
			if (!hasAmount) {
				continue;
			}
			if (
				Object.prototype.hasOwnProperty.call(
					resourceV2.parentChildren,
					resourceId,
				)
			) {
				continue;
			}
			const clamped = clampToBounds(
				rawValue ?? 0,
				resourceV2.bounds[resourceId],
			);
			resourceV2.amounts[resourceId] = clamped;
			resourceV2.recentDeltas[resourceId] = 0;
			resourceV2.hookSuppressions[resourceId] = undefined;
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
	const baseResourceV2 = getPlayerStartResourceV2Config(baseConfig) || {};
	const overrideResourceV2 =
		getPlayerStartResourceV2Config(overrideConfig) || {};
	for (const [resourceId, value] of Object.entries(overrideResourceV2)) {
		const baseValue = baseResourceV2[resourceId] ?? 0;
		const overrideValue = value ?? 0;
		if (overrideValue === baseValue) {
			continue;
		}
		(diff as PlayerStartResourceV2Config).resourceV2 =
			(diff as PlayerStartResourceV2Config).resourceV2 || {};
		(diff as PlayerStartResourceV2Config).resourceV2![resourceId] =
			overrideValue;
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
	resourceV2Registry?: ResourceV2EngineRegistry,
): ResourceKey {
	if (resourceV2Registry) {
		const flagged: string[] = [];
		for (const resourceId of resourceV2Registry.resourceIds) {
			const hasGlobalActionCost =
				resourceV2Registry.hasGlobalActionCost(resourceId);
			if (hasGlobalActionCost) {
				flagged.push(resourceId);
			}
		}
		if (flagged.length > 1) {
			const listed = flagged.join('", "');
			const message = [
				'Multiple ResourceV2 definitions',
				`("${listed}") declare global action cost metadata.`,
				'Configure exactly one globalActionCost',
				'resource before creating the engine.',
			].join(' ');
			throw new Error(message);
		}
		if (flagged.length === 1) {
			return flagged[0] as ResourceKey;
		}
	}
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
