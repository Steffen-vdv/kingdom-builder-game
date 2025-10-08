import type {
	EngineSessionSnapshot,
	PlayerId,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import type {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
} from '@kingdom-builder/contents';
import type { TranslationContext, TranslationPassives } from './types';
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

type TranslationSessionHelpers = {
	pullEffectLog?: <T>(key: string) => T | undefined;
	evaluationMods?: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
};

type TranslationContextOptions = {
	ruleSnapshot: RuleSnapshot;
	passiveRecords: EngineSessionSnapshot['passiveRecords'];
};

export function createTranslationContext(
	session: EngineSessionSnapshot,
	registries: {
		actions: typeof ACTIONS;
		buildings: typeof BUILDINGS;
		developments: typeof DEVELOPMENTS;
	},
	helpers: TranslationSessionHelpers | undefined,
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
	const evaluationMods = cloneEvaluationModifiers(helpers?.evaluationMods);
	const ruleSnapshot = cloneRuleSnapshot(options.ruleSnapshot);
	const passiveDefinitionLists = mapPassiveDefinitionLists(
		options.passiveRecords,
	);
	const passiveDefinitionLookup = mapPassiveDefinitionLookup(
		passiveDefinitionLists,
	);
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
		getDefinition(id: string, owner: PlayerId) {
			const definitions = passiveDefinitionLookup.get(owner);
			return definitions?.get(id);
		},
		definitions(owner: PlayerId) {
			return passiveDefinitionLists.get(owner) ?? EMPTY_PASSIVE_DEFINITIONS;
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
		rules: ruleSnapshot,
	});
}
