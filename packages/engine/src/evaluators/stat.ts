import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { StatKey } from '../state';
import { getResourceValue } from '../resource-v2';

export interface StatEvaluatorParams extends Record<string, unknown> {
	/** V2 resource identifier (stat IDs are ResourceV2 IDs) */
	resourceId?: StatKey;
	/** @deprecated Use resourceId instead */
	key?: StatKey;
}

export const statEvaluator: EvaluatorHandler<number, StatEvaluatorParams> = (
	definition,
	engineContext: EngineContext,
) => {
	// V2 resourceId takes precedence over legacy key
	// Both are ResourceV2 IDs (e.g. 'resource:stat:army-strength')
	const resourceId =
		(definition.params?.resourceId as StatKey) ||
		(definition.params?.key as StatKey);
	return getResourceValue(engineContext.activePlayer, resourceId);
};
