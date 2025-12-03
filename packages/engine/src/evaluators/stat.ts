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
	// key IS the ResourceV2 ID (e.g. 'resource:stat:army-strength')
	const key = definition.params?.key as StatKey;
	return getResourceValue(engineContext.activePlayer, key);
};
