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
		if (requirement.type === 'evaluator' && requirement.method === 'compare') {
			icons.push(
				...collectEvaluatorIcons(
					requirement.params?.['left'] as EvalConfig | undefined,
				),
			);
			icons.push(
				...collectEvaluatorIcons(
					requirement.params?.['right'] as EvalConfig | undefined,
				),
			);
		}
	}
	return icons.filter(Boolean);
}
