import type {
	SessionPlayerId,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import type { SessionRegistries } from '../../state/sessionRegistries';
import type {
        TranslationContext,
        TranslationInfo,
        TranslationPassives,
        TranslationResourceDefinition,
        TranslationResourceRegistry,
} from './types';
import {
	cloneCompensations,
	cloneEvaluationModifiers,
	clonePassiveSummary,
	clonePlayer,
	cloneRecentResourceGains,
	flattenPassives,
	mapPassives,
	mapPassiveDescriptors,
	wrapRegistry,
} from './contextHelpers';
import {
        EMPTY_PASSIVE_DEFINITIONS,
        cloneRuleSnapshot,
        mapPassiveDefinitionLists,
        mapPassiveDefinitionLookup,
} from './passiveDefinitions';
import {
        DEFAULT_LAND_INFO,
        DEFAULT_MODIFIER_INFO,
        DEFAULT_PASSIVE_INFO,
        DEFAULT_POPULATION_INFO,
        DEFAULT_SLOT_INFO,
        DEFAULT_STATS,
} from './defaultInfo';

type TranslationContextOptions = {
        ruleSnapshot: SessionRuleSnapshot;
        passiveRecords: SessionSnapshot['passiveRecords'];
};

function cloneResourceDefinition(
        definition: TranslationResourceDefinition,
): TranslationResourceDefinition {
        const cloned: TranslationResourceDefinition = { key: definition.key };
        if (definition.icon !== undefined) {
                cloned.icon = definition.icon;
        }
        if (definition.label !== undefined) {
                cloned.label = definition.label;
        }
        if (definition.description !== undefined) {
                cloned.description = definition.description;
        }
        if (definition.tags !== undefined) {
                cloned.tags = [...definition.tags];
        }
        return Object.freeze(cloned);
}

function cloneResourceRegistry(
        resources: SessionRegistries['resources'],
): TranslationResourceRegistry {
        return Object.freeze(
                Object.fromEntries(
                        Object.entries(resources).map(([key, definition]) => [
                                key,
                                cloneResourceDefinition(definition),
                        ]),
                ),
        );
}

function createTranslationInfo(): TranslationInfo {
        return Object.freeze({
                population: DEFAULT_POPULATION_INFO,
                passive: DEFAULT_PASSIVE_INFO,
                land: DEFAULT_LAND_INFO,
                slot: DEFAULT_SLOT_INFO,
                modifier: Object.freeze({
                        cost: DEFAULT_MODIFIER_INFO.cost,
                        result: DEFAULT_MODIFIER_INFO.result,
                }),
        });
}

export function createTranslationContext(
        session: SessionSnapshot,
        registries: Pick<
                SessionRegistries,
                'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
        >,
        metadata: SessionSnapshotMetadata,
        options: TranslationContextOptions,
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
	const evaluationMods = cloneEvaluationModifiers(
		metadata.passiveEvaluationModifiers,
	);
	const ruleSnapshot = cloneRuleSnapshot(options.ruleSnapshot);
	const passiveDefinitionLists = mapPassiveDefinitionLists(
		options.passiveRecords,
	);
	const passiveDefinitionLookup = mapPassiveDefinitionLookup(
		passiveDefinitionLists,
	);
	const effectLogs = new Map<string, unknown[]>();
	if (metadata.effectLogs) {
		const entries = Object.entries(metadata.effectLogs);
		for (const [key, logEntries] of entries) {
			effectLogs.set(key, [...logEntries]);
		}
	}
        const translationPassives: TranslationPassives = Object.freeze({
                list(owner?: SessionPlayerId) {
                        if (owner) {
                                return passives.get(owner)?.map(clonePassiveSummary) ?? [];
                        }
			return flattenPassives(passives);
		},
		get(id: string, owner: SessionPlayerId) {
			const ownerDescriptors = passiveDescriptors.get(owner);
			return ownerDescriptors?.get(id);
		},
		getDefinition(id: string, owner: SessionPlayerId) {
			const definitions = passiveDefinitionLookup.get(owner);
			return definitions?.get(id);
		},
		definitions(owner: SessionPlayerId) {
			return passiveDefinitionLists.get(owner) ?? EMPTY_PASSIVE_DEFINITIONS;
		},
		get evaluationMods() {
			return evaluationMods;
                },
        });
        const info = createTranslationInfo();
        return Object.freeze({
                actions: wrapRegistry(registries.actions),
                buildings: wrapRegistry(registries.buildings),
                developments: wrapRegistry(registries.developments),
                populations: wrapRegistry(registries.populations),
                resources: cloneResourceRegistry(registries.resources),
                stats: DEFAULT_STATS,
                info,
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
			const queue = effectLogs.get(key);
			if (!queue || queue.length === 0) {
				return undefined;
			}
			const next = queue.shift();
			if (queue.length === 0) {
				effectLogs.delete(key);
			}
			if (next === undefined) {
				return undefined;
			}
			if (typeof next === 'object' && next !== null) {
				return structuredClone(next) as T;
			}
			return next as T;
		},
		actionCostResource: session.actionCostResource,
		recentResourceGains: cloneRecentResourceGains(session.recentResourceGains),
		compensations: cloneCompensations(session.compensations),
		rules: ruleSnapshot,
	});
}
