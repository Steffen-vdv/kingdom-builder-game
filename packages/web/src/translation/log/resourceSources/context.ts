import type {
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

interface ActivePlayerLike {
	id: SessionPlayerId;
	lands: Array<{
		developments: string[];
	}>;
	population: Record<string, number>;
	stats: Record<string, number>;
}

type EvaluateParams = {
	type: string;
	params?: Record<string, unknown>;
};

export interface TranslationDiffContext {
	readonly activePlayer: ActivePlayerLike;
	readonly buildings: {
		get(id: string): unknown;
		has?(id: string): boolean;
	};
	readonly developments: {
		get(id: string): unknown;
		has?(id: string): boolean;
	};
	readonly passives: TranslationDiffPassives;
	evaluate(evaluator: EvaluateParams): number;
}

type EngineLikeContext = {
	activePlayer: ActivePlayerLike;
	buildings: TranslationDiffContext['buildings'];
	developments: TranslationDiffContext['developments'];
	passives: unknown;
	game?: {
		players: Array<{
			id: SessionPlayerId;
			population: Record<string, number>;
			passives?: SessionPassiveSummary[];
		}>;
	};
	evaluate?: (evaluator: EvaluateParams) => number;
};

function normalizePassives(source: unknown): TranslationDiffPassives {
	const lookup = source as PassiveLookup | undefined;
	const evaluationMods = (lookup?.evaluationMods ??
		new Map()) as PassiveModifierMap;
	const passives: TranslationDiffPassives = { evaluationMods };
	if (lookup?.get) {
		passives.get = lookup.get.bind(lookup);
	}
	return passives;
}

function countDevelopments(
	player: ActivePlayerLike | undefined,
	id: unknown,
): number {
	if (!player || typeof id !== 'string') {
		return 0;
	}
	return player.lands.reduce((total, land) => {
		return (
			total +
			land.developments.filter((development) => development === id).length
		);
	}, 0);
}

function countPopulation(
	player: ActivePlayerLike | undefined,
	role: unknown,
): number {
	if (!player) {
		return 0;
	}
	if (typeof role === 'string' && role.length > 0) {
		return Number(player.population[role] ?? 0);
	}
	return Object.values(player.population).reduce((total, value) => {
		return total + Number(value ?? 0);
	}, 0);
}

function readStat(player: ActivePlayerLike | undefined, key: unknown): number {
	if (!player || typeof key !== 'string' || key.length === 0) {
		return 0;
	}
	return Number(player.stats[key] ?? 0);
}

type CompareEvaluatorParams = {
	left?: number | EvaluateParams;
	right?: number | EvaluateParams;
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
};

function compareValues(
	left: number,
	right: number,
	operator?: string,
): boolean {
	switch (operator) {
		case 'lt':
			return left < right;
		case 'lte':
			return left <= right;
		case 'gt':
			return left > right;
		case 'gte':
			return left >= right;
		case 'ne':
			return left !== right;
		case 'eq':
		default:
			return left === right;
	}
}

function evaluateDefinition(
	definition: EvaluateParams,
	player: ActivePlayerLike | undefined,
	evaluate: (definition: EvaluateParams) => number,
): number {
	switch (definition.type) {
		case 'development': {
			const id = definition.params?.['id'];
			return countDevelopments(player, id);
		}
		case 'population': {
			const role = definition.params?.['role'];
			return countPopulation(player, role);
		}
		case 'stat': {
			const key = definition.params?.['key'];
			return readStat(player, key);
		}
		case 'compare': {
			const params = definition.params as CompareEvaluatorParams | undefined;
			if (!params) {
				return 0;
			}
			const left =
				typeof params.left === 'number'
					? params.left
					: params.left
						? Number(evaluate(params.left))
						: 0;
			const right =
				typeof params.right === 'number'
					? params.right
					: params.right
						? Number(evaluate(params.right))
						: 0;
			return compareValues(left, right, params.operator) ? 1 : 0;
		}
		default:
			return 0;
	}
}

function createEvaluator(
	context: EngineLikeContext,
): (definition: EvaluateParams) => number {
	if (typeof context.evaluate === 'function') {
		return (definition) => Number(context.evaluate?.(definition) ?? 0);
	}
	const evaluate = (definition: EvaluateParams): number => {
		return evaluateDefinition(definition, context.activePlayer, evaluate);
	};
	return evaluate;
}

export function createTranslationDiffContext(
	context: EngineLikeContext,
): TranslationDiffContext {
	const passives = normalizePassives(context.passives);
	const evaluator = createEvaluator(context);
	return {
		activePlayer: context.activePlayer,
		buildings: context.buildings,
		developments: context.developments,
		passives,
		evaluate: evaluator,
	};
}

export type { EngineLikeContext as TranslationDiffContextSource };
