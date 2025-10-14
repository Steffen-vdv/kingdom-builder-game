import type {
	ActionEffectGroup,
	ActionEffectGroupOption,
	RequirementConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionRequirementFailure,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from './sessionTypes';
import type { GameSessionApi } from './GameContext.types';

interface CompareEvaluatorParams {
	left?: number | { type: string; params?: Record<string, unknown> };
	right?: number | { type: string; params?: Record<string, unknown> };
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}

interface CompareRequirementParams {
	left?: { type: string; params?: Record<string, unknown> } | number;
	right?: { type: string; params?: Record<string, unknown> } | number;
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}

type EvaluatorDefinition = { type: string; params?: Record<string, unknown> };

type SnapshotPlayer = SessionSnapshot['game']['players'][number];

type PlayerView = SnapshotPlayer;

const isActionEffectGroup = (effect: unknown): effect is ActionEffectGroup => {
	if (!effect || typeof effect !== 'object') {
		return false;
	}
	return (
		'options' in effect && Array.isArray((effect as ActionEffectGroup).options)
	);
};

const normalizeNumber = (value: unknown): number => {
	const numeric = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numeric)) {
		return 0;
	}
	return numeric;
};

const compareValues = (
	left: number,
	right: number,
	operator: CompareRequirementParams['operator'],
) => {
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
};

const countDevelopments = (
	player: PlayerView | undefined,
	id: unknown,
): number => {
	if (!player || typeof id !== 'string' || id.length === 0) {
		return 0;
	}
	let total = 0;
	for (const land of player.lands) {
		total += land.developments.filter(
			(development) => development === id,
		).length;
	}
	return total;
};

const countPopulation = (
	player: PlayerView | undefined,
	role: unknown,
): number => {
	if (!player) {
		return 0;
	}
	if (typeof role === 'string' && role.length > 0) {
		return normalizeNumber(player.population[role]);
	}
	return Object.values(player.population).reduce((sum, value) => {
		return sum + normalizeNumber(value);
	}, 0);
};

const readStat = (player: PlayerView | undefined, key: unknown): number => {
	if (!player || typeof key !== 'string' || key.length === 0) {
		return 0;
	}
	return normalizeNumber(player.stats[key]);
};

const evaluateDefinition = (
	definition: EvaluatorDefinition | number | undefined,
	player: PlayerView | undefined,
	evaluate: (definition: EvaluatorDefinition) => number,
): number => {
	if (typeof definition === 'number') {
		return definition;
	}
	if (!definition || typeof definition !== 'object') {
		return 0;
	}
	switch (definition.type) {
		case 'development':
			return countDevelopments(player, definition.params?.['id']);
		case 'population':
			return countPopulation(player, definition.params?.['role']);
		case 'stat':
			return readStat(player, definition.params?.['key']);
		case 'compare': {
			const params = definition.params as CompareEvaluatorParams | undefined;
			if (!params) {
				return 0;
			}
			const left = evaluateDefinition(params.left, player, evaluate);
			const right = evaluateDefinition(params.right, player, evaluate);
			return compareValues(left, right, params.operator) ? 1 : 0;
		}
		default:
			return evaluate(definition);
	}
};

const evaluateRequirement = (
	requirement: RequirementConfig,
	player: PlayerView | undefined,
	evaluate: (definition: EvaluatorDefinition) => number,
): SessionRequirementFailure | null => {
	if (requirement.type !== 'evaluator' || requirement.method !== 'compare') {
		return null;
	}
	const params = requirement.params as CompareRequirementParams | undefined;
	if (!params) {
		return null;
	}
	const left = evaluateDefinition(params.left, player, evaluate);
	const right = evaluateDefinition(params.right, player, evaluate);
	if (compareValues(left, right, params.operator)) {
		return null;
	}
	return {
		requirement,
		details: { left, right },
	};
};

const toPlayerView = (
	player: SnapshotPlayer | undefined,
): PlayerView | undefined => player;

const sanitizeCosts = (
	costs: Record<string, unknown>,
): Record<string, number> => {
	const result: Record<string, number> = {};
	for (const [key, value] of Object.entries(costs)) {
		const numeric = normalizeNumber(value);
		if (numeric !== 0) {
			result[key] = numeric;
			continue;
		}
		if (value === 0 || value === null || value === undefined) {
			result[key] = 0;
		}
	}
	return result;
};

const DEFAULT_ACTION_POINT_COST = 1;

export interface CreateSessionApiOptions {
	sessionState: SessionSnapshot;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations'
	>;
}

export function createSessionApi({
	sessionState,
	registries,
}: CreateSessionApiOptions): GameSessionApi {
	const getActivePlayer = (): PlayerView | undefined => {
		const activeId = sessionState.game.activePlayerId;
		const entry = sessionState.game.players.find(
			(player) => player.id === activeId,
		);
		return toPlayerView(entry);
	};

	const getActionDefinition = (actionId: string) => {
		try {
			return registries.actions.get(actionId);
		} catch {
			return undefined;
		}
	};

	const evaluate = (definition: EvaluatorDefinition): number => {
		if (!definition || typeof definition !== 'object') {
			return 0;
		}
		switch (definition.type) {
			case 'development':
			case 'population':
			case 'stat':
			case 'compare':
				return evaluateDefinition(definition, getActivePlayer(), evaluate);
			default:
				return 0;
		}
	};

	const getActionCosts: GameSessionApi['getActionCosts'] = (actionId) => {
		const definition = getActionDefinition(actionId);
		if (!definition) {
			return {};
		}
		const baseCosts = sanitizeCosts(definition.baseCosts ?? {});
		const costResource = sessionState.actionCostResource;
		if (costResource && baseCosts[costResource] === undefined) {
			baseCosts[costResource] = definition.system
				? 0
				: DEFAULT_ACTION_POINT_COST;
		}
		return baseCosts;
	};

	const getActionRequirements: GameSessionApi['getActionRequirements'] = (
		actionId,
	) => {
		const definition = getActionDefinition(actionId);
		if (!definition || !Array.isArray(definition.requirements)) {
			return [];
		}
		const activePlayer = getActivePlayer();
		const failures: SessionRequirementFailure[] = [];
		for (const requirement of definition.requirements) {
			const failure = evaluateRequirement(requirement, activePlayer, evaluate);
			if (failure) {
				failures.push(failure);
			}
		}
		return failures;
	};

	const getActionOptions: GameSessionApi['getActionOptions'] = (actionId) => {
		const definition = getActionDefinition(actionId);
		if (!definition || !Array.isArray(definition.effects)) {
			return [];
		}
		const groups: ActionEffectGroup[] = [];
		for (const effect of definition.effects) {
			if (!isActionEffectGroup(effect)) {
				continue;
			}
			const normalizedOptions = effect.options.map(
				(option): ActionEffectGroupOption => ({
					...option,
				}),
			);
			groups.push({ ...effect, options: normalizedOptions });
		}
		return groups;
	};

	return {
		getActionCosts,
		getActionRequirements,
		getActionOptions,
	};
}
