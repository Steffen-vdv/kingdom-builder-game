import { Registry } from "../registry";
import type { EngineContext } from "../context";

import { developmentEvaluator } from "./development";
export interface EvaluatorDef {
  type: string;
  params?: Record<string, any>;
}

export interface EvaluatorHandler<R = any> {
  (def: EvaluatorDef, ctx: EngineContext): R;
}

export class EvaluatorRegistry extends Registry<EvaluatorHandler> {}

export const EVALUATORS = new EvaluatorRegistry();

export function registerCoreEvaluators(registry: EvaluatorRegistry = EVALUATORS) {
  registry.add("development", developmentEvaluator);
}

export { developmentEvaluator } from "./development";
