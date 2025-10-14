import type {
	ActionEffectGroup,
	RequirementConfig,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';

const DEFAULT_ACTION_AP_COST = 1;

const isActionEffectGroup = (effect: unknown): effect is ActionEffectGroup => {
	return Boolean(effect && typeof effect === 'object' && 'options' in effect);
};

const resolvePlaceholder = (
	value: unknown,
	params: Record<string, unknown> | undefined,
): unknown => {
	if (typeof value === 'string' && value.startsWith('$')) {
		const key = value.slice(1);
		if (key.length > 0 && params && key in params) {
			return params[key];
		}
	}
	return value;
};

const substitutePlaceholders = (
	input: unknown,
	params: Record<string, unknown> | undefined,
): unknown => {
	if (Array.isArray(input)) {
		return input.map((entry) => substitutePlaceholders(entry, params));
	}
	if (!input || typeof input !== 'object') {
		return resolvePlaceholder(input, params);
	}
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
		result[key] = substitutePlaceholders(value, params);
	}
	return result;
};

const countDevelopments = (
	player: SessionSnapshot['game']['players'][number] | undefined,
	id: unknown,
): number => {
	if (!player || typeof id !== 'string') {
		return 0;
	}
	let total = 0;
	for (const land of player.lands) {
		for (const development of land.developments) {
			if (development === id) {
				total += 1;
			}
		}
	}
	return total;
};

const countPopulation = (
	player: SessionSnapshot['game']['players'][number] | undefined,
	role: unknown,
): number => {
	if (!player) {
		return 0;
	}
	if (typeof role === 'string' && role.length > 0) {
		const value = player.population[role];
		return Number(value ?? 0);
	}
	let total = 0;
	for (const value of Object.values(player.population)) {
		total += Number(value ?? 0);
	}
	return total;
};

const readStat = (
	player: SessionSnapshot['game']['players'][number] | undefined,
	key: unknown,
): number => {
	if (!player || typeof key !== 'string' || key.length === 0) {
		return 0;
	}
	const value = player.stats[key];
	if (value === undefined) {
		return 0;
	}
	if (typeof value === 'number') {
		return value;
	}
	if (typeof value === 'object' && value && 'current' in value) {
		const numeric = (value as { current?: number }).current;
		return Number(numeric ?? 0);
	}
	return 0;
};

const compareValues = (
	left: number,
	right: number,
	operator: string | undefined,
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

const evaluateDefinitionValue = (
	definition: unknown,
	snapshot: SessionSnapshot,
	params: Record<string, unknown> | undefined,
): number => {
	if (typeof definition === 'number') {
		return definition;
	}
	if (typeof definition !== 'object' || definition === null) {
		return Number(definition ?? 0);
	}
	const substituted = substitutePlaceholders(definition, params);
	if (typeof substituted !== 'object' || substituted === null) {
		return 0;
	}
	const resolved = substituted as {
		type?: string;
		params?: Record<string, unknown>;
	};
	const activePlayer = snapshot.game.players.find(
		(player) => player.id === snapshot.game.activePlayerId,
	);
	switch (resolved.type) {
		case 'development': {
			const id = resolved.params?.['id'];
			return countDevelopments(activePlayer, id);
		}
		case 'population': {
			const role = resolved.params?.['role'];
			return countPopulation(activePlayer, role);
		}
		case 'stat': {
			const key = resolved.params?.['key'];
			return readStat(activePlayer, key);
		}
		case 'compare': {
			const left = evaluateDefinitionValue(
				resolved.params?.['left'],
				snapshot,
				params,
			);
			const right = evaluateDefinitionValue(
				resolved.params?.['right'],
				snapshot,
				params,
			);
			const operatorValue = resolved.params?.['operator'];
			const operator =
				typeof operatorValue === 'string' ? operatorValue : undefined;
			return compareValues(left, right, operator) ? 1 : 0;
		}
		default:
			return 0;
	}
};

const evaluateRequirement = (
	requirement: RequirementConfig,
	snapshot: SessionSnapshot,
	params: Record<string, unknown> | undefined,
): boolean => {
	if (requirement.type === 'evaluator' && requirement.method === 'compare') {
		const rawParams = requirement.params ?? {};
		const resolvedParams = substitutePlaceholders(rawParams, params);
		const normalizedParams =
			typeof resolvedParams === 'object' && resolvedParams
				? (resolvedParams as Record<string, unknown>)
				: {};
		const left = evaluateDefinitionValue(
			normalizedParams['left'],
			snapshot,
			params,
		);
		const right = evaluateDefinitionValue(
			normalizedParams['right'],
			snapshot,
			params,
		);
		const operatorValue = normalizedParams['operator'];
		const operator =
			typeof operatorValue === 'string' ? operatorValue : undefined;
		return compareValues(left, right, operator);
	}
	return true;
};

export interface SessionActionApi {
	getActionCosts: (
		actionId: string,
		params?: Record<string, unknown>,
	) => Record<string, number | undefined>;
	getActionRequirements: (
		actionId: string,
		params?: Record<string, unknown>,
	) => SessionRequirementFailure[];
	getActionOptions: (actionId: string) => ActionEffectGroup[];
}

export const createSessionActionApi = ({
	snapshot,
	actionCostResource,
	registries,
}: {
	snapshot: SessionSnapshot;
	actionCostResource: SessionResourceKey;
	registries: SessionRegistries;
}): SessionActionApi => {
	return {
		getActionCosts(actionId, params) {
			let costs: Record<string, number | undefined> = {};
			try {
				const definition = registries.actions.get(actionId);
				const substituted = params
					? substitutePlaceholders(definition.baseCosts ?? {}, params)
					: (definition.baseCosts ?? {});
				if (
					typeof substituted === 'object' &&
					substituted !== null &&
					!Array.isArray(substituted)
				) {
					costs = {
						...(substituted as Record<string, number | undefined>),
					};
				}
				if (actionCostResource && costs[actionCostResource] === undefined) {
					costs[actionCostResource] = definition.system
						? 0
						: DEFAULT_ACTION_AP_COST;
				}
			} catch {
				if (actionCostResource && costs[actionCostResource] === undefined) {
					costs[actionCostResource] = DEFAULT_ACTION_AP_COST;
				}
			}
			return costs;
		},
		getActionRequirements(actionId, params) {
			try {
				const definition = registries.actions.get(actionId);
				const requirements = definition.requirements ?? [];
				const failures: SessionRequirementFailure[] = [];
				for (const requirement of requirements) {
					if (!evaluateRequirement(requirement, snapshot, params)) {
						failures.push({ requirement });
					}
				}
				return failures;
			} catch {
				return [];
			}
		},
		getActionOptions(actionId) {
			try {
				const definition = registries.actions.get(actionId);
				return (definition.effects ?? []).filter(isActionEffectGroup);
			} catch {
				return [];
			}
		},
	};
};
