import type { EvaluatorHandler, EvaluatorDef } from './index';
import type { EngineContext } from '../context';

export interface DevelopmentEvaluatorParams {
  id: string;
}

export const developmentEvaluator: EvaluatorHandler<number> = (
  def: EvaluatorDef,
  ctx: EngineContext,
) => {
  const params = def.params as Partial<DevelopmentEvaluatorParams> | undefined;
  if (!params?.id) throw new Error('development evaluator requires id param');
  const { id } = params;
  return ctx.activePlayer.lands.reduce(
    (total, land) => total + land.developments.filter((d) => d === id).length,
    0,
  );
};
