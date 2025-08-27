import { Registry } from '../registry';
import type { EngineContext } from '../context';

import { developmentEvaluator } from './development';
export interface EvaluatorDef<
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  type: string;
  params?: P;
}

export interface EvaluatorHandler<
  R = unknown,
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  (def: EvaluatorDef<P>, ctx: EngineContext): R;
}

export class EvaluatorRegistry extends Registry<EvaluatorHandler> {}

export const EVALUATORS = new EvaluatorRegistry();

export function registerCoreEvaluators(
  registry: EvaluatorRegistry = EVALUATORS,
) {
  registry.add('development', developmentEvaluator);
}

export { developmentEvaluator } from './development';
