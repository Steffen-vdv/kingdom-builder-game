import type {
	EngineSessionSnapshot,
	PassiveRecord,
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
	mapPassiveDescriptors,
	mapPassives,
	wrapRegistry,
} from './helpers';

type TranslationSessionHelpers = {
	pullEffectLog?: <T>(key: string) => T | undefined;
	evaluationMods?: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
};

type PassiveRecordMap = ReadonlyMap<PlayerId, readonly PassiveRecord[]>;

type TranslationContextOptions = {
	helpers?: TranslationSessionHelpers;
	ruleSnapshot: RuleSnapshot;
	passiveRecords: PassiveRecordMap;
};

export function createTranslationContext(
	session: EngineSessionSnapshot,
	registries: {
		actions: typeof ACTIONS;
		buildings: typeof BUILDINGS;
		developments: typeof DEVELOPMENTS;
	},
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
		options.helpers?.evaluationMods,
	);
	const passiveRecords = options.passiveRecords;
	const ruleSnapshot: RuleSnapshot = {
		tieredResourceKey: options.ruleSnapshot.tieredResourceKey,
		tierDefinitions: structuredClone(options.ruleSnapshot.tierDefinitions),
	};
	const clonePassiveRecords = (
		definitions: readonly PassiveRecord[] | undefined,
	): PassiveRecord[] => {
		if (!definitions) {
			return [];
		}
		return definitions.map((definition) => structuredClone(definition));
	};
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
		values(owner?: PlayerId) {
			if (owner) {
				return clonePassiveRecords(passiveRecords.get(owner));
			}
			return Array.from(passiveRecords.values()).flatMap((definitions) =>
				clonePassiveRecords(definitions),
			);
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
		ruleSnapshot,
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
			if (!options.helpers?.pullEffectLog) {
				return undefined;
			}
			return options.helpers.pullEffectLog<T>(key);
		},
		actionCostResource: session.actionCostResource,
		recentResourceGains: cloneRecentResourceGains(session.recentResourceGains),
		compensations: cloneCompensations(session.compensations),
	});
}
