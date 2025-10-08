import {
	EVALUATORS,
	type EngineContext,
	type PlayerId,
} from '@kingdom-builder/engine';
import { type PassiveDescriptor, type PassiveModifierMap } from './types';

interface PassiveLookup {
	evaluationMods?: PassiveModifierMap;
	get?: (id: string, owner: PlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffPassives {
	evaluationMods: PassiveModifierMap;
	get?: (id: string, owner: PlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffContext {
	readonly activePlayer: EngineContext['activePlayer'];
	readonly buildings: EngineContext['buildings'];
	readonly developments: EngineContext['developments'];
	readonly passives: TranslationDiffPassives;
	evaluate(evaluator: {
		type: string;
		params?: Record<string, unknown>;
	}): number;
}

export function createTranslationDiffContext(
	context: EngineContext,
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
			const handler = EVALUATORS.get(evaluator.type);
			if (!handler) {
				throw new Error(`Unknown evaluator handler for ${evaluator.type}`);
			}
			return Number(handler(evaluator, context));
		},
	};
}
