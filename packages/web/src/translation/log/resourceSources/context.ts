import { EVALUATORS } from '@kingdom-builder/engine';
import type {
	BuildingConfig,
	DevelopmentConfig,
	SessionPassiveSummary,
	SessionPlayerId,
} from '@kingdom-builder/protocol';
import { type PassiveDescriptor, type PassiveModifierMap } from './types';

interface PassiveLookup {
	evaluationMods?: PassiveModifierMap;
	get?: (id: string, owner: SessionPlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffPassives {
	evaluationMods: PassiveModifierMap;
	get?: (id: string, owner: SessionPlayerId) => PassiveDescriptor | undefined;
}

type RegistryLike<T> = {
	get(id: string): T | undefined;
	has(id: string): boolean;
};

export type LegacyEngineContext = {
	activePlayer: { id: SessionPlayerId };
	buildings: RegistryLike<BuildingConfig>;
	developments: RegistryLike<DevelopmentConfig>;
	passives: PassiveLookup & {
		list(owner?: SessionPlayerId): SessionPassiveSummary[];
	};
};

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
			const handler = EVALUATORS.get(evaluator.type);
			if (!handler) {
				throw new Error(`Unknown evaluator handler for ${evaluator.type}`);
			}
			return Number(handler(evaluator, context as never));
		},
	};
}
