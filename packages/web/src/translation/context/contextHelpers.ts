import type {
	EngineSessionSnapshot,
	PassiveSummary,
	PlayerId,
} from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	TranslationPassiveDescriptor,
	TranslationPassiveModifierMap,
	TranslationPlayer,
	TranslationRegistry,
} from './types';

export function cloneRecord<T>(record: Record<string, T>): Record<string, T> {
	return Object.freeze({ ...record });
}

export function clonePassiveMeta(
	meta: NonNullable<PassiveSummary['meta']>,
): NonNullable<PassiveSummary['meta']> {
	const cloned: NonNullable<PassiveSummary['meta']> = {};
	if (meta.source !== undefined) {
		cloned.source = { ...meta.source };
	}
	if (meta.removal !== undefined) {
		cloned.removal = { ...meta.removal };
	}
	return Object.freeze(cloned);
}

export function clonePassiveSummary(summary: PassiveSummary): PassiveSummary {
	const cloned: PassiveSummary = { id: summary.id };
	if (summary.name !== undefined) {
		cloned.name = summary.name;
	}
	if (summary.icon !== undefined) {
		cloned.icon = summary.icon;
	}
	if (summary.detail !== undefined) {
		cloned.detail = summary.detail;
	}
	if (summary.meta !== undefined) {
		cloned.meta = clonePassiveMeta(summary.meta);
	}
	return Object.freeze(cloned);
}

export function toPassiveDescriptor(
	summary: PassiveSummary,
): TranslationPassiveDescriptor {
	const descriptor: TranslationPassiveDescriptor = {};
	if (summary.icon !== undefined) {
		descriptor.icon = summary.icon;
	}
	const sourceIcon = summary.meta?.source?.icon;
	if (sourceIcon !== undefined) {
		descriptor.meta = Object.freeze({
			source: Object.freeze({ icon: sourceIcon }),
		});
	}
	return Object.freeze(descriptor);
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

export function mapPassives(
	players: EngineSessionSnapshot['game']['players'],
): ReadonlyMap<PlayerId, PassiveSummary[]> {
	return new Map(
		players.map((player) => [
			player.id,
			player.passives.map(clonePassiveSummary),
		]),
	);
}

export function flattenPassives(
	passives: ReadonlyMap<PlayerId, PassiveSummary[]>,
): PassiveSummary[] {
	return Array.from(passives.values()).flatMap((entries) =>
		entries.map(clonePassiveSummary),
	);
}

export function mapPassiveDescriptors(
	passives: ReadonlyMap<PlayerId, PassiveSummary[]>,
): ReadonlyMap<PlayerId, Map<string, TranslationPassiveDescriptor>> {
	return new Map(
		Array.from(passives.entries()).map(([owner, list]) => [
			owner,
			new Map(
				list.map((summary) => [summary.id, toPassiveDescriptor(summary)]),
			),
		]),
	);
}

export function cloneRecentResourceGains(
	recent: EngineSessionSnapshot['recentResourceGains'],
): ReadonlyArray<{ key: string; amount: number }> {
	return Object.freeze(recent.map((entry) => ({ ...entry })));
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
