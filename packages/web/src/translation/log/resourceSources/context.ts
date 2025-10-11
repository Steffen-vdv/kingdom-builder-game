import type {
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	SessionPlayerId,
} from '@kingdom-builder/protocol';
import type {
	TranslationRegistry,
	TranslationResourceRegistry,
} from '../../context';
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
	readonly activePlayer: {
		id: SessionPlayerId;
		population: Record<string, number>;
		lands: ReadonlyArray<{
			developments: ReadonlyArray<string>;
		}>;
	};
	readonly buildings: TranslationRegistry<BuildingConfig>;
	readonly developments: TranslationRegistry<DevelopmentConfig>;
	readonly populations: TranslationRegistry<PopulationConfig>;
	readonly resources: TranslationResourceRegistry;
	readonly passives: TranslationDiffPassives;
	evaluate(evaluator: {
		type: string;
		params?: Record<string, unknown>;
	}): number;
}

function evaluateDevelopment(
	definition: { params?: Record<string, unknown> },
	context: TranslationDiffContext,
): number {
	const id = definition.params?.['id'];
	if (typeof id !== 'string') {
		return 0;
	}
	return context.activePlayer.lands.reduce((total, land) => {
		return (
			total +
			land.developments.filter((development) => development === id).length
		);
	}, 0);
}

function evaluatePopulation(
	definition: { params?: Record<string, unknown> },
	context: TranslationDiffContext,
): number {
	const role = definition.params?.['role'];
	if (typeof role === 'string') {
		return Number(context.activePlayer.population[role] ?? 0);
	}
	return Object.values(context.activePlayer.population).reduce(
		(total, count) => {
			return total + Number(count ?? 0);
		},
		0,
	);
}

function evaluateDefinition(
	definition: { type: string; params?: Record<string, unknown> },
	context: TranslationDiffContext,
): number {
	switch (definition.type) {
		case 'development':
			return evaluateDevelopment(definition, context);
		case 'population':
			return evaluatePopulation(definition, context);
		default:
			throw new Error(`Unknown evaluator handler for ${definition.type}`);
	}
}

export function createTranslationDiffContext(context: {
	activePlayer: TranslationDiffContext['activePlayer'];
	buildings: TranslationRegistry<BuildingConfig>;
	developments: TranslationRegistry<DevelopmentConfig>;
	populations: TranslationRegistry<PopulationConfig>;
	resources: TranslationResourceRegistry;
	passives: unknown;
}): TranslationDiffContext {
	const rawPassives = context.passives as PassiveLookup | undefined;
	const evaluationMods = (rawPassives?.evaluationMods ??
		new Map()) as PassiveModifierMap;
	const getPassive = rawPassives?.get
		? rawPassives.get.bind(rawPassives)
		: undefined;
	const passives: TranslationDiffPassives = { evaluationMods };
	if (getPassive) {
		passives.get = getPassive;
	}
	return {
		activePlayer: context.activePlayer,
		buildings: context.buildings,
		developments: context.developments,
		populations: context.populations,
		resources: context.resources,
		passives,
		evaluate(evaluator) {
			return Number(evaluateDefinition(evaluator, this));
		},
	};
}
