import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { StatKey } from '../state';

export interface StatEvaluatorParams extends Record<string, unknown> {
	key: StatKey;
}

export const statEvaluator: EvaluatorHandler<number, StatEvaluatorParams> = (
	definition,
	engineContext: EngineContext,
) => {
	const key = definition.params?.key as StatKey;
	if (!key) {
		return 0;
	}
	const resourceId = engineContext.activePlayer.getStatResourceV2Id(key);
	const value = engineContext.activePlayer.resourceValues[resourceId];
	return typeof value === 'number' ? value : 0;
};
