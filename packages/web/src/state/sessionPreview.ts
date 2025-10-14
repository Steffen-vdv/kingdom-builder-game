import type {
	ActionEffect,
	ActionEffectGroup,
	RequirementConfig,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { TranslationContext } from '../translation/context';
import type { GameEngineSessionApi } from './GameContext.types';

type CompareOperand =
	| number
	| { type?: string; params?: Record<string, unknown> };

interface CompareParams {
	left?: CompareOperand;
	right?: CompareOperand;
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}

const EMPTY_REQUIREMENTS: SessionRequirementFailure[] = [];

const EMPTY_SESSION_API: GameEngineSessionApi = {
	getActionCosts: () => ({}),
	getActionRequirements: () => EMPTY_REQUIREMENTS,
	getActionOptions: () => [],
};

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	if (Array.isArray(value)) {
		return JSON.parse(JSON.stringify(value)) as T;
	}
	if (value && typeof value === 'object') {
		return { ...(value as Record<string, unknown>) } as T;
	}
	return value;
};

const cloneCostBag = (costs: Record<string, number> | undefined) =>
	costs ? clone(costs) : {};

const hasOptions = (effect: ActionEffect): effect is ActionEffectGroup =>
	'options' in effect && Array.isArray(effect.options);

const getNestedEffects = (effect: ActionEffect): ActionEffect[] | undefined => {
	if ('effects' in effect && Array.isArray(effect.effects)) {
		return effect.effects;
	}
	return undefined;
};

function evaluatePopulation(
	player: SessionSnapshot['game']['players'][number],
	params: Record<string, unknown> | undefined,
): number {
	const role = params?.['role'];
	if (typeof role === 'string') {
		return Number(player.population[role] ?? 0);
	}
	return Object.values(player.population).reduce((total, value) => {
		return total + Number(value ?? 0);
	}, 0);
}

function evaluateDevelopment(
	player: SessionSnapshot['game']['players'][number],
	params: Record<string, unknown> | undefined,
): number {
	const id = params?.['id'];
	if (typeof id !== 'string') {
		return 0;
	}
	return player.lands.reduce((total, land) => {
		const matchingDevelopments = land.developments.filter((development) => {
			return development === id;
		});
		return total + matchingDevelopments.length;
	}, 0);
}

function evaluateStat(
	player: SessionSnapshot['game']['players'][number],
	params: Record<string, unknown> | undefined,
): number {
	const key = params?.['key'];
	if (typeof key !== 'string') {
		return 0;
	}
	return Number(player.stats[key] ?? 0);
}

function evaluateOperand(
	operand: CompareOperand | undefined,
	player: SessionSnapshot['game']['players'][number],
): number {
	if (typeof operand === 'number') {
		return operand;
	}
	if (!operand || typeof operand !== 'object') {
		return 0;
	}
	const { type, params } = operand;
	switch (type) {
		case 'population':
			return evaluatePopulation(player, params);
		case 'development':
			return evaluateDevelopment(player, params);
		case 'stat':
			return evaluateStat(player, params);
		default:
			return 0;
	}
}

function compareValues(
	left: number,
	right: number,
	operator: CompareParams['operator'],
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

function evaluateRequirement(
	requirement: RequirementConfig,
	player: SessionSnapshot['game']['players'][number] | undefined,
): SessionRequirementFailure | null {
	if (!player) {
		return null;
	}
	if (requirement.type !== 'evaluator' || requirement.method !== 'compare') {
		return null;
	}
	const params = requirement.params as CompareParams | undefined;
	const leftValue = evaluateOperand(params?.left, player);
	const rightValue = evaluateOperand(params?.right, player);
	if (compareValues(leftValue, rightValue, params?.operator)) {
		return null;
	}
	const details: Record<string, unknown> = {};
	if (Number.isFinite(leftValue)) {
		details.left = leftValue;
	}
	if (Number.isFinite(rightValue)) {
		details.right = rightValue;
	}
	const failure: SessionRequirementFailure = { requirement };
	if (Object.keys(details).length > 0) {
		failure.details = details;
	}
	return failure;
}

function collectActionEffectGroups(
	effects: readonly ActionEffect[],
): ActionEffectGroup[] {
	const queue: ActionEffect[] = [...effects];
	const groups: ActionEffectGroup[] = [];
	while (queue.length > 0) {
		const effect = queue.shift();
		if (!effect) {
			continue;
		}
		if (hasOptions(effect)) {
			groups.push(clone<ActionEffectGroup>(effect));
		}
		const nested = getNestedEffects(effect);
		if (nested) {
			queue.push(...nested);
		}
	}
	return groups;
}

export function createSessionPreviewApi(
	sessionState: SessionSnapshot,
	translationContext: TranslationContext | null,
): GameEngineSessionApi {
	if (!translationContext) {
		return EMPTY_SESSION_API;
	}
	const actionRegistry = translationContext.actions;
	const activePlayer = sessionState.game.players.find(
		(player) => player.id === sessionState.game.activePlayerId,
	);
	const getDefinition = (actionId: string) => {
		if (!actionRegistry.has(actionId)) {
			return null;
		}
		return actionRegistry.get(actionId);
	};
	return {
		getActionCosts(actionId) {
			const definition = getDefinition(actionId);
			return cloneCostBag(definition?.baseCosts);
		},
		getActionRequirements(actionId) {
			const definition = getDefinition(actionId);
			const requirements: RequirementConfig[] = definition?.requirements ?? [];
			if (requirements.length === 0) {
				return EMPTY_REQUIREMENTS;
			}
			const failures: SessionRequirementFailure[] = [];
			for (const requirement of requirements) {
				const failure = evaluateRequirement(requirement, activePlayer);
				if (failure) {
					failures.push(failure);
				}
			}
			if (failures.length === 0) {
				return EMPTY_REQUIREMENTS;
			}
			return failures;
		},
		getActionOptions(actionId) {
			const definition = getDefinition(actionId);
			if (!definition || !Array.isArray(definition.effects)) {
				return [];
			}
			return collectActionEffectGroups(definition.effects);
		},
	} satisfies GameEngineSessionApi;
}
