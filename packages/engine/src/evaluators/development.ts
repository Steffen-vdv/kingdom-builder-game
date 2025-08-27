import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';

export interface DevelopmentEvaluatorParams extends Record<string, unknown> {
  id: string;
}

export const developmentEvaluator: EvaluatorHandler<
  number,
  DevelopmentEvaluatorParams
> = (def, ctx: EngineContext) => {
  const { id } = def.params!;
  return ctx.activePlayer.lands.reduce(
    (total, land) => total + land.developments.filter((d) => d === id).length,
    0,
  );
};
