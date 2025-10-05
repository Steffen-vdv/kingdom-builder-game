import type {
	EngineSessionSnapshot,
	PassiveSummary,
	PlayerId,
} from '@kingdom-builder/engine';
import type {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
} from '@kingdom-builder/contents';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	TranslationContext,
	TranslationPassiveDescriptor,
	TranslationPassives,
	TranslationPlayer,
	TranslationPassiveModifierMap,
	TranslationRegistry,
} from './types';

type TranslationSessionHelpers = {
	pullEffectLog?: <T>(key: string) => T | undefined;
	evaluationMods?: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
};

function cloneRecord<T>(record: Record<string, T>): Record<string, T> {
	return Object.freeze({ ...record });
}

function clonePassiveMeta(
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

function clonePassiveSummary(summary: PassiveSummary): PassiveSummary {
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

function toPassiveDescriptor(
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

function clonePlayer(
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

function wrapRegistry<TDefinition>(registry: {
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

function cloneCompensations(
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

function mapPassives(
	players: EngineSessionSnapshot['game']['players'],
): ReadonlyMap<PlayerId, PassiveSummary[]> {
	return new Map(
		players.map((player) => [
			player.id,
			player.passives.map(clonePassiveSummary),
		]),
	);
}

function flattenPassives(
	passives: ReadonlyMap<PlayerId, PassiveSummary[]>,
): PassiveSummary[] {
	return Array.from(passives.values()).flatMap((entries) =>
		entries.map(clonePassiveSummary),
	);
}

function mapPassiveDescriptors(
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

function cloneRecentResourceGains(
	recent: EngineSessionSnapshot['recentResourceGains'],
): ReadonlyArray<{ key: string; amount: number }> {
	return Object.freeze(recent.map((entry) => ({ ...entry })));
}

function cloneEvaluationModifiers(
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

export function createTranslationContext(
	session: EngineSessionSnapshot,
	registries: {
		actions: typeof ACTIONS;
		buildings: typeof BUILDINGS;
		developments: typeof DEVELOPMENTS;
	},
	helpers?: TranslationSessionHelpers,
): TranslationContext {
	const players = new Map(
		session.game.players.map((player) => [player.id, clonePlayer(player)]),
	);
	const activePlayer = players.get(session.game.activePlayerId);
	const opponent = players.get(session.game.opponentId);
	if (!activePlayer || !opponent) {
		throw new Error('Unable to resolve active players from session snapshot.');
	}
	const passives = mapPassives(session.game.players);
	const passiveDescriptors = mapPassiveDescriptors(passives);
	const evaluationMods = cloneEvaluationModifiers(helpers?.evaluationMods);
	const translationPassives: TranslationPassives = Object.freeze({
		list(owner?: PlayerId) {
			if (owner) {
				return passives.get(owner)?.map(clonePassiveSummary) ?? [];
			}
			return flattenPassives(passives);
		},
		get(id: string, owner: PlayerId) {
			const ownerDescriptors = passiveDescriptors.get(owner);
			return ownerDescriptors?.get(id);
		},
		get evaluationMods() {
			return evaluationMods;
		},
	});
	return Object.freeze({
		actions: wrapRegistry(registries.actions),
		buildings: wrapRegistry(registries.buildings),
		developments: wrapRegistry(registries.developments),
		passives: translationPassives,
		phases: Object.freeze(
			session.phases.map((phase) => {
				const entry: {
					id: string;
					icon?: string;
					label?: string;
					steps?: ReadonlyArray<{
						id: string;
						triggers?: readonly string[];
					}>;
				} = {
					id: phase.id,
				};
				if (phase.icon !== undefined) {
					entry.icon = phase.icon;
				}
				if (phase.label !== undefined) {
					entry.label = phase.label;
				}
				if (Array.isArray(phase.steps)) {
					entry.steps = Object.freeze(
						phase.steps.map((step) => {
							const stepEntry: { id: string; triggers?: readonly string[] } = {
								id: step.id,
							};
							if (Array.isArray(step.triggers)) {
								stepEntry.triggers = Object.freeze([...step.triggers]);
							}
							return Object.freeze(stepEntry);
						}),
					);
				}
				return Object.freeze(entry);
			}),
		),
		activePlayer,
		opponent,
		pullEffectLog<T>(key: string) {
			if (!helpers?.pullEffectLog) {
				return undefined;
			}
			return helpers.pullEffectLog<T>(key);
		},
		actionCostResource: session.actionCostResource,
		recentResourceGains: cloneRecentResourceGains(session.recentResourceGains),
		compensations: cloneCompensations(session.compensations),
	});
}
