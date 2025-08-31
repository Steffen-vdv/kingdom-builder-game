import type { EngineContext } from '@kingdom-builder/engine';
import { STATS, POPULATION_ROLES } from '@kingdom-builder/contents';
import type { StatKey, PopulationRoleId } from '@kingdom-builder/engine/state';

interface EvalConfig {
  type: string;
  params?: Record<string, unknown>;
}

function collectEvaluatorIcons(evaluator?: EvalConfig): string[] {
  if (!evaluator) return [];
  if (evaluator.type === 'stat') {
    const key = evaluator.params?.['key'] as StatKey | undefined;
    return key ? [STATS[key]?.icon || ''] : [];
  }
  if (evaluator.type === 'population') {
    const role = evaluator.params?.['role'] as PopulationRoleId | undefined;
    return role ? [POPULATION_ROLES[role]?.icon || ''] : [];
  }
  return [];
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
