import type {
	ActionConfig,
	ActionEffect,
	ActionEffectGroup,
	RequirementConfig,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type { GameSessionApi } from './GameContext.types';
import type { SessionRegistries } from './sessionTypes';

type RequirementParams = Record<string, unknown> | undefined;

interface EvaluatorShape {
	type?: string;
	params?: RequirementParams;
}

type RequirementResult = {
	satisfied: boolean;
	failure?: RequirementConfig;
};

function cloneCosts(costs: Record<string, number> | undefined) {
	if (!costs) {
		return {} as Record<string, number>;
	}
	const cloned: Record<string, number> = {};
	for (const [key, amount] of Object.entries(costs)) {
		cloned[key] = Number(amount ?? 0);
	}
	return cloned;
}

function resolveParamValue(value: unknown, params: RequirementParams) {
	if (typeof value === 'string' && value.startsWith('$')) {
		const resolved = params?.[value.slice(1)];
		if (resolved !== undefined) {
			return resolved;
		}
	}
	return value;
}

function countDevelopments(player: SessionPlayerStateSnapshot, id: unknown) {
	if (typeof id !== 'string') {
		return 0;
	}
	return player.lands.reduce((total, land) => {
		const matches = land.developments.filter(
			(development) => development === id,
		);
		return total + matches.length;
	}, 0);
}

function evaluateRequirementValue(
	value: unknown,
	player: SessionPlayerStateSnapshot,
	params: RequirementParams,
): number {
	if (typeof value === 'number') {
		return value;
	}
	if (!value || typeof value !== 'object') {
		return 0;
	}
	const evaluator = value as EvaluatorShape;
	const evaluatorParams = evaluator.params;
	switch (evaluator.type) {
		case 'population': {
			const role = resolveParamValue(evaluatorParams?.['role'], params);
			if (typeof role === 'string') {
				return Number(player.population[role] ?? 0);
			}
			return Object.values(player.population).reduce(
				(sum, count) => sum + Number(count ?? 0),
				0,
			);
		}
		case 'stat': {
			const key = resolveParamValue(evaluatorParams?.['key'], params);
			if (typeof key === 'string') {
				return Number(player.stats[key] ?? 0);
			}
			return 0;
		}
		case 'development': {
			const id = resolveParamValue(evaluatorParams?.['id'], params);
			return countDevelopments(player, id);
		}
		case 'compare': {
			const left = evaluateRequirementValue(
				evaluatorParams?.['left'],
				player,
				params,
			);
			const right = evaluateRequirementValue(
				evaluatorParams?.['right'],
				player,
				params,
			);
			const operator = evaluatorParams?.['operator'];
			return compareValues(left, right, operator) ? 1 : 0;
		}
		default:
			return 0;
	}
}

function compareValues(left: number, right: number, operator: unknown) {
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
	player: SessionPlayerStateSnapshot,
	params: RequirementParams,
): RequirementResult {
	if (requirement.type !== 'evaluator') {
		return { satisfied: true };
	}
	if (requirement.method !== 'compare') {
		return { satisfied: true };
	}
	const definition = requirement.params ?? {};
	const left = evaluateRequirementValue(definition['left'], player, params);
	const right = evaluateRequirementValue(definition['right'], player, params);
	const operator = definition['operator'];
	const satisfied = compareValues(left, right, operator);
	if (satisfied) {
		return { satisfied: true };
	}
	return { satisfied: false, failure: requirement };
}

function isEffectGroup(effect: ActionEffect): effect is ActionEffectGroup {
	return Boolean(effect && typeof effect === 'object' && 'options' in effect);
}

export function createSessionActionApi(
	snapshot: SessionSnapshot,
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'resources'
	>,
): GameSessionApi {
	const getActionDefinition = (actionId: string): ActionConfig | undefined => {
		try {
			return registries.actions.get(actionId);
		} catch {
			return undefined;
		}
	};
	const getActivePlayer = () =>
		snapshot.game.players.find(
			(player) => player.id === snapshot.game.activePlayerId,
		);
	return {
		getActionCosts(actionId) {
			const definition = getActionDefinition(actionId);
			return cloneCosts(definition?.baseCosts);
		},
		getActionRequirements(actionId, params) {
			const definition = getActionDefinition(actionId);
			if (!definition) {
				return [];
			}
			const player = getActivePlayer();
			if (!player) {
				return [];
			}
			const failures = [] as RequirementConfig[];
			const requirements = definition.requirements ?? [];
			for (const requirement of requirements) {
				const result = evaluateRequirement(requirement, player, params);
				if (!result.satisfied && result.failure) {
					failures.push(result.failure);
				}
			}
			return failures.map((requirement) => ({
				requirement,
				...(requirement.message ? { message: requirement.message } : {}),
			}));
		},
		getActionOptions(actionId) {
			const definition = getActionDefinition(actionId);
			if (!definition) {
				return [];
			}
			return (definition.effects ?? []).filter(isEffectGroup);
		},
	};
}
