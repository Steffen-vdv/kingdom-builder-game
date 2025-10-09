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
	return engineContext.activePlayer.stats[key] || 0;
};
