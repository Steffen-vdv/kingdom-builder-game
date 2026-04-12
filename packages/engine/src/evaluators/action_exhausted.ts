import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import { getStartingTier } from '../pool/fillAlgorithm';

export interface ActionExhaustedEvaluatorParams extends Record<
	string,
	unknown
> {
	metaCategory?: string;
	minTier?: number;
}

/**
 * Counts the number of exhausted (completed one-time) actions
 * belonging to the active player.
 *
 * Optionally filtered by:
 * - `metaCategory`: only count actions in this meta-category
 * - `minTier`: only count actions whose starting tier is at
 *   least this value
 */
export const actionExhaustedEvaluator: EvaluatorHandler<
	number,
	ActionExhaustedEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const { metaCategory, minTier } = definition.params ?? {};
	const player = engineContext.activePlayer;
	let count = 0;

	for (const [actionId, state] of Object.entries(player.actionStates)) {
		if (!state.exhausted) {
			continue;
		}
		if (metaCategory || minTier !== undefined) {
			const actionDef = engineContext.actions.get(actionId);
			if (!actionDef) {
				continue;
			}
			if (metaCategory && actionDef.metaCategory !== metaCategory) {
				continue;
			}
			if (minTier !== undefined) {
				const startTier = getStartingTier(actionDef);
				if (startTier < minTier) {
					continue;
				}
			}
		}
		count++;
	}

	return count;
};
