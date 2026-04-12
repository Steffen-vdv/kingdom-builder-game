import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';

export interface BuildingEvaluatorParams extends Record<string, unknown> {
	id?: string;
}

/**
 * Counts buildings owned by the active player.
 *
 * If `id` is provided, returns 1 when the player owns that
 * building and 0 otherwise. Without `id`, returns the total
 * number of buildings the player owns.
 */
export const buildingEvaluator: EvaluatorHandler<
	number,
	BuildingEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const { id } = definition.params ?? {};
	if (id) {
		return engineContext.activePlayer.buildings.has(id) ? 1 : 0;
	}
	return engineContext.activePlayer.buildings.size;
};
