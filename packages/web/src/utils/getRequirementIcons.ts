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
  if (!evaluator) return [];
  return EVALUATOR_ICON_MAP[evaluator.type]?.(evaluator.params) ?? [];
}

interface RequirementConfig {
  type: string;
  method: string;
  params?: Record<string, unknown>;
}

export function getRequirementIcons(
  actionId: string,
  ctx: EngineContext,
): string[] {
  const def = ctx.actions.get(actionId);
  if (!def?.requirements) return [];
  const icons: string[] = [];
  for (const req of def.requirements as RequirementConfig[]) {
    if (req.type === 'evaluator' && req.method === 'compare') {
      icons.push(
        ...collectEvaluatorIcons(
          req.params?.['left'] as EvalConfig | undefined,
        ),
      );
      icons.push(
        ...collectEvaluatorIcons(
          req.params?.['right'] as EvalConfig | undefined,
        ),
      );
    }
  }
  return icons.filter(Boolean);
}
