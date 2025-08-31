import { Registry } from '../registry';
import type { EngineContext } from '../context';

import { developmentEvaluator } from './development';
import { populationEvaluator } from './population';
import { statEvaluator } from './stat';
import { compareEvaluator } from './compare';
export interface EvaluatorDef<
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  type: string;
  params?: P | undefined;
}

export interface EvaluatorHandler<
  R = unknown,
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  (definition: EvaluatorDef<P>, ctx: EngineContext): R;
}

export class EvaluatorRegistry extends Registry<EvaluatorHandler> {}

export const EVALUATORS = new EvaluatorRegistry();

export function registerCoreEvaluators(
  registry: EvaluatorRegistry = EVALUATORS,
) {
  registry.add('development', developmentEvaluator);
  registry.add('population', populationEvaluator);
  registry.add('stat', statEvaluator);
  registry.add('compare', compareEvaluator);
}

export { developmentEvaluator } from './development';
export { populationEvaluator } from './population';
export { statEvaluator } from './stat';
export { compareEvaluator } from './compare';
