import { Registry } from '@boardsmith/protocol';
import type { EngineContext } from '../context';

import { developmentEvaluator } from './development';
import { landEvaluator } from './land';
import { resourceEvaluator } from './resource';
import { compareEvaluator } from './compare';
import { buildingEvaluator } from './building';
import { actionExhaustedEvaluator } from './action_exhausted';
import { developmentCountAllEvaluator } from './development_count_all';
import { opponentResourceEvaluator } from './opponent_resource';
import type { EvaluatorDef } from '@boardsmith/protocol';

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
	registry.add('building', buildingEvaluator);
	registry.add('action-exhausted', actionExhaustedEvaluator);
	registry.add('development-count-all', developmentCountAllEvaluator);
	registry.add('opponent-resource', opponentResourceEvaluator);
}

export { developmentEvaluator } from './development';
export { landEvaluator } from './land';
export { resourceEvaluator } from './resource';
export { compareEvaluator } from './compare';
export { buildingEvaluator } from './building';
export { actionExhaustedEvaluator } from './action_exhausted';
export { developmentCountAllEvaluator } from './development_count_all';
export { opponentResourceEvaluator } from './opponent_resource';
export type { EvaluatorDef } from '@boardsmith/protocol';
