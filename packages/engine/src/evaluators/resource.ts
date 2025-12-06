import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import { getResourceValue } from '../resource-v2';

export interface ResourceEvaluatorParams extends Record<string, unknown> {
	/** V2 resource identifier */
	resourceId?: string;
	/** @deprecated Use resourceId instead */
	key?: string;
}

export const resourceEvaluator: EvaluatorHandler<
	number,
	ResourceEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	// V2 resourceId takes precedence over legacy key
	const resourceId =
		(definition.params?.resourceId as string) ||
		(definition.params?.key as string);
	return getResourceValue(engineContext.activePlayer, resourceId);
};
