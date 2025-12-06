import { Registry } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';

import { developmentEvaluator } from './development';
import { landEvaluator } from './land';
import { resourceEvaluator } from './resource';
import { compareEvaluator } from './compare';
import type { EvaluatorDef } from '@kingdom-builder/protocol';

export interface EvaluatorHandler<
	R = unknown,
	P extends Record<string, unknown> = Record<string, unknown>,
> {
	(definition: EvaluatorDef<P>, engineContext: EngineContext): R;
}

export class EvaluatorRegistry extends Registry<EvaluatorHandler> {}

export const EVALUATORS = new EvaluatorRegistry();

export function registerCoreEvaluators(
	registry: EvaluatorRegistry = EVALUATORS,
) {
	registry.add('development', developmentEvaluator);
	registry.add('land', landEvaluator);
	registry.add('resource', resourceEvaluator);
	registry.add('compare', compareEvaluator);
}

export { developmentEvaluator } from './development';
export { landEvaluator } from './land';
export { resourceEvaluator } from './resource';
export { compareEvaluator } from './compare';
export type { EvaluatorDef } from '@kingdom-builder/protocol';
