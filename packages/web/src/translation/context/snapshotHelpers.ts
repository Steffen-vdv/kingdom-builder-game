import type {
	EngineSessionSnapshot,
	PlayerId,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	TranslationPassiveModifierMap,
	TranslationPlayer,
	TranslationRegistry,
} from './types';

export function cloneRecord<T>(record: Record<string, T>): Record<string, T> {
	return Object.freeze({ ...record });
}

export function clonePlayer(
	player: EngineSessionSnapshot['game']['players'][number],
): TranslationPlayer {
	return Object.freeze({
		id: player.id,
		name: player.name,
		resources: cloneRecord(player.resources),
		stats: cloneRecord(player.stats),
		population: cloneRecord(player.population),
	});
}

export function wrapRegistry<TDefinition>(registry: {
	get(id: string): TDefinition;
	has(id: string): boolean;
}): TranslationRegistry<TDefinition> {
	return Object.freeze({
		get(id: string) {
			return registry.get(id);
		},
		has(id: string) {
			return registry.has(id);
		},
	});
}

function clonePlayerStartConfig(config: PlayerStartConfig): PlayerStartConfig {
	return JSON.parse(JSON.stringify(config)) as PlayerStartConfig;
}

export function cloneCompensations(
	compensations: EngineSessionSnapshot['compensations'],
): Record<PlayerId, PlayerStartConfig> {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(compensations).map(([playerId, config]) => [
				playerId,
				clonePlayerStartConfig(config),
			]),
		),
	) as Record<PlayerId, PlayerStartConfig>;
}

export function cloneRecentResourceGains(
	recent: EngineSessionSnapshot['recentResourceGains'],
): ReadonlyArray<{ key: string; amount: number }> {
	return Object.freeze(recent.map((entry) => ({ ...entry })));
}

export function cloneRuleSnapshot(rule: RuleSnapshot): RuleSnapshot {
	return {
		tieredResourceKey: rule.tieredResourceKey,
		tierDefinitions: rule.tierDefinitions.map((definition) =>
			structuredClone(definition),
		),
	};
}

export function cloneEvaluationModifiers(
	evaluationMods?: ReadonlyMap<string, ReadonlyMap<string, unknown>>,
): TranslationPassiveModifierMap {
	if (!evaluationMods) {
		return new Map();
	}
	return new Map(
		Array.from(evaluationMods.entries()).map(([modifierId, mods]) => [
			modifierId,
			new Map(mods) as ReadonlyMap<string, unknown>,
		]),
	);
}
