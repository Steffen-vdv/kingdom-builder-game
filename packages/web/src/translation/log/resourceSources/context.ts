import type { SessionPlayerId } from '@kingdom-builder/protocol';
import type { LegacyEngineContext } from '../../context';
import { type PassiveDescriptor, type PassiveModifierMap } from './types';

interface PassiveLookup {
	evaluationMods?: PassiveModifierMap;
	get?: (id: string, owner: SessionPlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffPassives {
	evaluationMods: PassiveModifierMap;
	get?: (id: string, owner: SessionPlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffContext {
	readonly activePlayer: LegacyEngineContext['activePlayer'];
	readonly buildings: LegacyEngineContext['buildings'];
	readonly developments: LegacyEngineContext['developments'];
	readonly passives: TranslationDiffPassives;
	evaluate(evaluator: {
		type: string;
		params?: Record<string, unknown>;
	}): number;
}

interface LegacyLand {
	readonly developments?: ReadonlyArray<string> | undefined;
}

interface LegacyPlayerWithLands {
	readonly lands?: ReadonlyArray<LegacyLand>;
}

function evaluateDevelopment(
	evaluator: { params?: Record<string, unknown> } | undefined,
	context: LegacyEngineContext,
): number {
	const id = evaluator?.params?.['id'];
	if (typeof id !== 'string') {
		return 0;
	}
	const legacyPlayer = context.activePlayer as LegacyPlayerWithLands;
	const lands = legacyPlayer.lands;
	if (!lands) {
		return 0;
	}
	let total = 0;
	for (const land of lands) {
		const developments = land.developments;
		if (!developments) {
			continue;
		}
		for (const development of developments) {
			if (development === id) {
				total += 1;
			}
		}
	}
	return total;
}

function evaluatePopulation(
	evaluator: { params?: Record<string, unknown> } | undefined,
	context: LegacyEngineContext,
): number {
	const role = evaluator?.params?.['role'];
	if (typeof role !== 'string') {
		return 0;
	}
	const population = context.activePlayer.population;
	const value = population?.[role];
	return typeof value === 'number' ? value : 0;
}

function evaluateLegacy(
	evaluator: { type: string; params?: Record<string, unknown> },
	context: LegacyEngineContext,
): number {
	switch (evaluator.type) {
		case 'development':
			return evaluateDevelopment(evaluator, context);
		case 'population':
			return evaluatePopulation(evaluator, context);
		default:
			return 0;
	}
}

export function createTranslationDiffContext(
	context: LegacyEngineContext,
): TranslationDiffContext {
	const rawPassives = context.passives as unknown;
	const passiveLookup = rawPassives as PassiveLookup | undefined;
	const evaluationMods = (passiveLookup?.evaluationMods ??
		new Map()) as PassiveModifierMap;
	const getPassive = passiveLookup?.get
		? passiveLookup.get.bind(passiveLookup)
		: undefined;
	const passives: TranslationDiffPassives = { evaluationMods };
	if (getPassive) {
		passives.get = getPassive;
	}
	return {
		activePlayer: context.activePlayer,
		buildings: context.buildings,
		developments: context.developments,
		passives,
		evaluate(evaluator) {
			return evaluateLegacy(evaluator, context);
		},
	};
}
