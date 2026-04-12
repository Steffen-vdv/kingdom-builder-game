import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import { getResourceValue } from '../resource/state';

export interface OpponentResourceEvaluatorParams extends Record<
	string,
	unknown
> {
	resourceId: string;
}

/**
 * Returns the value of a resource belonging to the
 * opponent (inactive) player.
 */
export const opponentResourceEvaluator: EvaluatorHandler<
	number,
	OpponentResourceEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const resourceId = definition.params?.resourceId as string;
	return getResourceValue(engineContext.opponent, resourceId);
};
