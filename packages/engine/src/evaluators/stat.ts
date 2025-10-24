import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { StatKey } from '../state';
import { getResourceValue } from '../resource-v2';

export interface StatEvaluatorParams extends Record<string, unknown> {
	key: StatKey;
}

export const statEvaluator: EvaluatorHandler<number, StatEvaluatorParams> = (
	definition,
	engineContext: EngineContext,
) => {
	const key = definition.params?.key;
	if (typeof key !== 'string') {
		return 0;
	}
	const resourceId = engineContext.activePlayer.getStatResourceV2Id(key);
	return getResourceValue(engineContext.activePlayer, resourceId);
};
