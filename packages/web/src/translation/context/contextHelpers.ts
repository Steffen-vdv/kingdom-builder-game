import type {
	ActionCategoryConfig,
	PlayerStartConfig,
	Registry,
	SessionPassiveEvaluationModifierMap,
	SessionPassiveSummary,
	SessionPlayerId,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type {
	TranslationActionCategoryDefinition,
	TranslationActionCategoryRegistry,
	TranslationPassiveDescriptor,
	TranslationPassiveModifierMap,
	TranslationPlayer,
	TranslationRegistry,
} from './types';
import { cloneResourceBounds, cloneResourceValues } from './resource';

export function cloneRecord<T>(record: Record<string, T>): Record<string, T> {
	return Object.freeze({ ...record });
}

export function clonePassiveMeta(
	meta: NonNullable<SessionPassiveSummary['meta']>,
): NonNullable<SessionPassiveSummary['meta']> {
	const cloned: NonNullable<SessionPassiveSummary['meta']> = {};
	if (meta.source !== undefined) {
		cloned.source = { ...meta.source };
	}
	if (meta.removal !== undefined) {
		cloned.removal = { ...meta.removal };
	}
	return Object.freeze(cloned);
}

export function clonePassiveSummary(
	summary: SessionPassiveSummary,
): SessionPassiveSummary {
	const cloned: SessionPassiveSummary = { id: summary.id };
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
	summary: SessionPassiveSummary,
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
	player: SessionSnapshot['game']['players'][number],
): TranslationPlayer {
	const resources = cloneResourceValues(player.values);
	const resourceBounds = cloneResourceBounds(player.resourceBounds);
	return Object.freeze({
		id: player.id,
		name: player.name,
		resources: cloneRecord(player.resources),
		stats: cloneRecord(player.stats),
		population: cloneRecord(player.population),
		resources,
		resourceBounds,
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

function normalizeActionCategoryDefinition(
	definition: ActionCategoryConfig,
): TranslationActionCategoryDefinition {
	return Object.freeze({
		id: definition.id,
		title: definition.title,
		subtitle: definition.subtitle ?? definition.title,
		...(definition.description !== undefined
			? { description: definition.description }
			: {}),
		icon: definition.icon,
		order: definition.order,
		layout: definition.layout,
		hideWhenEmpty: definition.hideWhenEmpty ?? false,
		...(definition.analyticsKey !== undefined
			? { analyticsKey: definition.analyticsKey }
			: {}),
	});
}

export function wrapActionCategoryRegistry(
	registry: Registry<ActionCategoryConfig>,
): TranslationActionCategoryRegistry {
	const entries = registry.values().map(normalizeActionCategoryDefinition);
	entries.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.id.localeCompare(right.id);
	});
	const ordered: ReadonlyArray<TranslationActionCategoryDefinition> =
		Object.freeze([...entries]);
	const byId = new Map(
		ordered.map((definition) => [definition.id, definition] as const),
	);
	return Object.freeze({
		get(id: string) {
			const definition = byId.get(id);
			if (!definition) {
				throw new Error(`Unknown action category definition for id "${id}".`);
			}
			return definition;
		},
		has(id: string) {
			return byId.has(id);
		},
		list() {
			return ordered;
		},
	});
}

function clonePlayerStartConfig(config: PlayerStartConfig): PlayerStartConfig {
	return JSON.parse(JSON.stringify(config)) as PlayerStartConfig;
}

export function cloneCompensations(
	compensations: SessionSnapshot['compensations'],
): Record<SessionPlayerId, PlayerStartConfig> {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(compensations).map(([playerId, config]) => [
				playerId,
				clonePlayerStartConfig(config),
			]),
		),
	) as Record<SessionPlayerId, PlayerStartConfig>;
}

export function mapPassives(
	players: SessionSnapshot['game']['players'],
): ReadonlyMap<SessionPlayerId, SessionPassiveSummary[]> {
	return new Map(
		players.map((player) => [
			player.id,
			player.passives.map(clonePassiveSummary),
		]),
	);
}

export function flattenPassives(
	passives: ReadonlyMap<SessionPlayerId, SessionPassiveSummary[]>,
): SessionPassiveSummary[] {
	return Array.from(passives.values()).flatMap((entries) =>
		entries.map(clonePassiveSummary),
	);
}

export function mapPassiveDescriptors(
	passives: ReadonlyMap<SessionPlayerId, SessionPassiveSummary[]>,
): ReadonlyMap<SessionPlayerId, Map<string, TranslationPassiveDescriptor>> {
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
	recent: SessionSnapshot['recentResourceGains'],
): ReadonlyArray<{ key: string; amount: number }> {
	return Object.freeze(recent.map((entry) => ({ ...entry })));
}

export function cloneEvaluationModifiers(
	evaluationMods?:
		| ReadonlyMap<string, ReadonlyMap<string, unknown>>
		| SessionPassiveEvaluationModifierMap,
): TranslationPassiveModifierMap {
	if (!evaluationMods) {
		return new Map();
	}
	if (evaluationMods instanceof Map) {
		const clones = new Map<string, ReadonlyMap<string, unknown>>();
		const typedEntries = evaluationMods.entries() as Iterable<
			readonly [string, ReadonlyMap<string, unknown>]
		>;
		for (const [modifierId, mods] of typedEntries) {
			const modEntries = Array.from(mods.entries()) as Array<
				readonly [string, unknown]
			>;
			clones.set(
				modifierId,
				new Map(modEntries) as ReadonlyMap<string, unknown>,
			);
		}
		return clones;
	}
	const entries = Object.entries(evaluationMods) as Array<
		[string, ReadonlyArray<string>]
	>;
	return new Map(
		entries.map(([modifierId, keys]) => [
			modifierId,
			new Map(keys.map((key) => [key, true])) as ReadonlyMap<string, unknown>,
		]),
	);
}
