import { Land, Stat } from '../state';
import type { PlayerState, StatKey, ResourceKey } from '../state';
import type { RuleSet } from '../services';
import { applyStatDelta } from '../stat_sources';
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
		const delta = (value ?? 0) - baseValue;
		if (delta !== 0) {
			diff.resources = diff.resources || {};
			diff.resources[resourceKey] = delta;
		}
	}
	for (const [statKey, value] of Object.entries(overrideConfig.stats || {})) {
		const baseValue = baseConfig.stats?.[statKey] ?? 0;
		const delta = (value ?? 0) - baseValue;
		if (delta !== 0) {
			diff.stats = diff.stats || {};
			diff.stats[statKey] = delta;
		}
	}
	return diff;
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
