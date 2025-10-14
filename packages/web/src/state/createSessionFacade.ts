import type {
	ActionEffect,
	ActionEffectGroup,
	ActionConfig,
	RequirementConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionRequirementFailure,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from './sessionTypes';

type RequirementComparator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';

interface CompareRequirementParams {
	left?: unknown;
	right?: unknown;
	operator?: RequirementComparator;
}

interface SessionFacadeOptions {
	sessionState: SessionSnapshot;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations'
	>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isRequirementOperator = (
	value: unknown,
): value is RequirementComparator => {
	return (
		value === 'lt' ||
		value === 'lte' ||
		value === 'gt' ||
		value === 'gte' ||
		value === 'eq' ||
		value === 'ne'
	);
};

export interface SessionFacade {
	getActionCosts(
		actionId: string,
		params?: Record<string, unknown>,
	): Record<string, number>;
	getActionRequirements(
		actionId: string,
		params?: Record<string, unknown>,
	): SessionRequirementFailure[];
	getActionOptions(actionId: string): ActionEffectGroup[];
}

const isActionEffectGroup = (
	effect: ActionEffect,
): effect is ActionEffectGroup => {
	if (!('options' in effect)) {
		return false;
	}
	const candidate = effect as { options?: unknown };
	return Array.isArray(candidate.options);
};

const resolvePlaceholder = (
	value: unknown,
	params: Record<string, unknown> | undefined,
): unknown => {
	if (typeof value !== 'string' || !value.startsWith('$')) {
		return value;
	}
	const key = value.slice(1);
	return params && key in params ? params[key] : undefined;
};

const countDevelopments = (
	player: SessionSnapshot['game']['players'][number] | undefined,
	developmentId: unknown,
): number => {
	if (
		!player ||
		typeof developmentId !== 'string' ||
		developmentId.length === 0
	) {
		return 0;
	}
	return player.lands.reduce((total, land) => {
		const matches = land.developments.filter(
			(entry) => entry === developmentId,
		);
		return total + matches.length;
	}, 0);
};

const countPopulation = (
	player: SessionSnapshot['game']['players'][number] | undefined,
	role: unknown,
): number => {
	if (!player) {
		return 0;
	}
	if (typeof role === 'string' && role.length > 0) {
		return Number(player.population[role] ?? 0);
	}
	return Object.values(player.population).reduce((total, value) => {
		return total + Number(value ?? 0);
	}, 0);
};

const readStat = (
	player: SessionSnapshot['game']['players'][number] | undefined,
	key: unknown,
): number => {
	if (!player || typeof key !== 'string' || key.length === 0) {
		return 0;
	}
	return Number(player.stats[key] ?? 0);
};

const compareValues = (
	left: number,
	right: number,
	operator: RequirementComparator | undefined,
): boolean => {
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

const evaluateRequirementValue = (
	definition: unknown,
	player: SessionSnapshot['game']['players'][number] | undefined,
	params: Record<string, unknown> | undefined,
): number => {
	if (typeof definition === 'number') {
		return definition;
	}
	if (
		definition === null ||
		typeof definition !== 'object' ||
		!('type' in definition)
	) {
		return 0;
	}
	const typed = definition as { type?: string; params?: unknown };
	const resolvedParams: Record<string, unknown> = {};
	if (isRecord(typed.params)) {
		for (const [key, value] of Object.entries(typed.params)) {
			resolvedParams[key] = resolvePlaceholder(value, params);
		}
	}
	switch (typed.type) {
		case 'development':
			return countDevelopments(player, resolvedParams['id']);
		case 'population':
			return countPopulation(player, resolvedParams['role']);
		case 'stat':
			return readStat(player, resolvedParams['key']);
		case 'compare': {
			const compareParams = resolvedParams as CompareRequirementParams;
			const left = evaluateRequirementValue(compareParams.left, player, params);
			const right = evaluateRequirementValue(
				compareParams.right,
				player,
				params,
			);
			return compareValues(left, right, compareParams.operator) ? 1 : 0;
		}
		default:
			return 0;
	}
};

const readCompareRequirementParams = (
	value: RequirementConfig['params'],
	placeholders: Record<string, unknown> | undefined,
): CompareRequirementParams => {
	if (!isRecord(value)) {
		return {};
	}
	const record = value;
	const leftCandidate = 'left' in record ? record.left : undefined;
	const rightCandidate = 'right' in record ? record.right : undefined;
	const operatorCandidate = 'operator' in record ? record.operator : undefined;
	const resolved: CompareRequirementParams = {};
	const left = resolvePlaceholder(leftCandidate, placeholders);
	const right = resolvePlaceholder(rightCandidate, placeholders);
	if (typeof left !== 'undefined') {
		resolved.left = left;
	}
	if (typeof right !== 'undefined') {
		resolved.right = right;
	}
	if (isRequirementOperator(operatorCandidate)) {
		resolved.operator = operatorCandidate;
	}
	return resolved;
};

const evaluateCompareRequirement = (
	requirement: RequirementConfig,
	player: SessionSnapshot['game']['players'][number] | undefined,
	params: Record<string, unknown> | undefined,
): SessionRequirementFailure | null => {
	const resolved = readCompareRequirementParams(requirement.params, params);
	const left = evaluateRequirementValue(resolved.left, player, params);
	const right = evaluateRequirementValue(resolved.right, player, params);
	if (compareValues(left, right, resolved.operator)) {
		return null;
	}
	const failure: SessionRequirementFailure = {
		requirement,
		details: { left, right },
	};
	if (typeof requirement.message === 'string') {
		failure.message = requirement.message;
	}
	return failure;
};

const collectEffectGroups = (
	effect: ActionEffect,
	groups: ActionEffectGroup[],
): void => {
	if (isActionEffectGroup(effect)) {
		groups.push(effect);
	}
	if ('effects' in effect && Array.isArray(effect.effects)) {
		for (const nested of effect.effects) {
			collectEffectGroups(nested, groups);
		}
	}
};

const cloneCosts = (baseCosts: ActionConfig['baseCosts'] | undefined) => {
	const costs: Record<string, number> = {};
	for (const [key, value] of Object.entries(baseCosts ?? {})) {
		if (typeof value === 'number' && Number.isFinite(value)) {
			costs[key] = value;
		}
	}
	return costs;
};

export function createSessionFacade({
	sessionState,
	registries,
}: SessionFacadeOptions): SessionFacade {
	const getActionDefinition = (actionId: string) => {
		if (!registries.actions.has(actionId)) {
			return undefined;
		}
		return registries.actions.get(actionId);
	};

	return {
		getActionCosts(actionId) {
			const definition = getActionDefinition(actionId);
			return cloneCosts(definition?.baseCosts);
		},
		getActionRequirements(actionId, params) {
			const definition = getActionDefinition(actionId);
			if (!definition || !Array.isArray(definition.requirements)) {
				return [];
			}
			const player = sessionState.game.players.find(
				(entry) => entry.id === sessionState.game.activePlayerId,
			);
			if (!player) {
				return [];
			}
			const failures: SessionRequirementFailure[] = [];
			for (const requirement of definition.requirements) {
				if (
					requirement.type === 'evaluator' &&
					requirement.method === 'compare'
				) {
					const failure = evaluateCompareRequirement(
						requirement,
						player,
						params,
					);
					if (failure) {
						failures.push(failure);
					}
				}
			}
			return failures;
		},
		getActionOptions(actionId) {
			const definition = getActionDefinition(actionId);
			if (!definition) {
				return [];
			}
			const groups: ActionEffectGroup[] = [];
			for (const effect of definition.effects ?? []) {
				collectEffectGroups(effect, groups);
			}
			return groups;
		},
	};
}
