import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import { getResourceValue } from '../resource-v2';

export interface ResourceEvaluatorParams extends Record<string, unknown> {
	key: string;
}

export const resourceEvaluator: EvaluatorHandler<
	number,
	ResourceEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const key = definition.params?.key as string;
	return getResourceValue(engineContext.activePlayer, key);
};
