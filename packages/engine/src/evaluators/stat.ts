import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { StatKey } from '../state';
import { getResourceValue } from '../resource-v2';

export interface StatEvaluatorParams extends Record<string, unknown> {
	/** V2 resource identifier (stat IDs are ResourceV2 IDs) */
	resourceId: StatKey;
}

export const statEvaluator: EvaluatorHandler<number, StatEvaluatorParams> = (
	definition,
	engineContext: EngineContext,
) => {
	const resourceId = definition.params?.resourceId as StatKey;
	return getResourceValue(engineContext.activePlayer, resourceId);
};
