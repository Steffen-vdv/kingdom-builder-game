import type {
	BuildingConfig,
	DevelopmentConfig,
	SessionPlayerId,
} from '@kingdom-builder/protocol';
import type {
	TranslationActionCategoryRegistry,
	TranslationAssets,
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
	readonly buildings: {
		get(id: string): BuildingConfig;
		has(id: string): boolean;
	};
	readonly developments: {
		get(id: string): DevelopmentConfig;
		has(id: string): boolean;
	};
	readonly actionCategories: TranslationActionCategoryRegistry;
	readonly passives: TranslationDiffPassives;
	readonly assets: TranslationAssets;
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
	buildings: {
		get(id: string): BuildingConfig;
		has?(id: string): boolean;
	};
	developments: {
		get(id: string): DevelopmentConfig;
		has?(id: string): boolean;
	};
	actionCategories: TranslationDiffContext['actionCategories'];
	passives: unknown;
	assets: TranslationAssets;
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
		buildings: {
			get: context.buildings.get.bind(context.buildings),
			has: context.buildings.has
				? context.buildings.has.bind(context.buildings)
				: (id: string) => context.buildings.get(id) !== undefined,
		},
		developments: {
			get: context.developments.get.bind(context.developments),
			has: context.developments.has
				? context.developments.has.bind(context.developments)
				: (id: string) => context.developments.get(id) !== undefined,
		},
		actionCategories: context.actionCategories,
		passives,
		assets: context.assets,
		evaluate(evaluator) {
			return Number(evaluateDefinition(evaluator, this));
		},
	};
}
