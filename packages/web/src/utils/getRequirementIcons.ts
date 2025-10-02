import type { EngineContext } from '@kingdom-builder/engine';
import {
	STATS,
	POPULATION_ROLES,
	type StatKey,
	type PopulationRoleId,
} from '@kingdom-builder/contents';

interface EvalConfig {
	type: string;
	params?: Record<string, unknown>;
}

export type EvaluatorIconGetter = (
	params?: Record<string, unknown>,
) => string[];

export const EVALUATOR_ICON_MAP: Record<string, EvaluatorIconGetter> = {
	stat: (params) => {
		const key = params?.['key'] as StatKey | undefined;
		return key ? [STATS[key]?.icon || ''] : [];
	},
	population: (params) => {
		const role = params?.['role'] as PopulationRoleId | undefined;
		return role ? [POPULATION_ROLES[role]?.icon || ''] : [];
	},
};

function collectEvaluatorIcons(evaluator?: EvalConfig): string[] {
	if (!evaluator) {
		return [];
	}
	return EVALUATOR_ICON_MAP[evaluator.type]?.(evaluator.params) ?? [];
}

interface RequirementConfig {
	type: string;
	method: string;
	params?: Record<string, unknown>;
}

export type RequirementIconGetter = (
	requirement: RequirementConfig,
	engineContext: EngineContext,
) => string[];

/**
 * Registry mapping requirement `type:method` pairs to icon extractors.
 *
 * Register additional handlers via {@link registerRequirementIconGetter}:
 *
 * ```ts
 * const unregister = registerRequirementIconGetter('myType', 'myMethod', (requirement, ctx) => {
 *         // derive icons from requirement.params / ctx
 *         return ['🛠️'];
 * });
 * // Call unregister() in tests or teardown logic if necessary.
 * ```
 */
export const REQUIREMENT_ICON_GETTERS = new Map<
	string,
	RequirementIconGetter
>();

export function registerRequirementIconGetter(
	type: string,
	method: string,
	getter: RequirementIconGetter,
): () => void {
	const registryKey = `${type}:${method}`;
	REQUIREMENT_ICON_GETTERS.set(registryKey, getter);
	return () => {
		const current = REQUIREMENT_ICON_GETTERS.get(registryKey);
		if (current === getter) {
			REQUIREMENT_ICON_GETTERS.delete(registryKey);
		}
	};
}

registerRequirementIconGetter('evaluator', 'compare', (requirement) => {
	const params = requirement.params ?? {};
	return [
		...collectEvaluatorIcons(params['left'] as EvalConfig | undefined),
		...collectEvaluatorIcons(params['right'] as EvalConfig | undefined),
	];
});

export function getRequirementIcons(
	actionId: string,
	engineContext: EngineContext,
): string[] {
	const actionDefinition = engineContext.actions.get(actionId);
	if (!actionDefinition?.requirements) {
		return [];
	}
	const icons: string[] = [];
	for (const requirement of actionDefinition.requirements as RequirementConfig[]) {
		const registryKey = `${requirement.type}:${requirement.method}`;
		const getter = REQUIREMENT_ICON_GETTERS.get(registryKey);
		if (!getter) {
			continue;
		}
		icons.push(...getter(requirement, engineContext));
	}
	return icons.filter(Boolean);
}
