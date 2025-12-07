import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import { getResourceValue } from '../resource';

export interface ResourceEvaluatorParams extends Record<string, unknown> {
	/** resource identifier */
	resourceId: string;
}

export const resourceEvaluator: EvaluatorHandler<
	number,
	ResourceEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const resourceId = definition.params?.resourceId as string;
	return getResourceValue(engineContext.activePlayer, resourceId);
};
