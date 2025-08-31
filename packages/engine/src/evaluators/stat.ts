import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { StatKey } from '../state';

export interface StatEvaluatorParams extends Record<string, unknown> {
  key: StatKey;
}

export const statEvaluator: EvaluatorHandler<number, StatEvaluatorParams> = (
  definition,
  ctx: EngineContext,
) => {
  const key = definition.params?.key as StatKey;
  return ctx.activePlayer.stats[key] || 0;
};
