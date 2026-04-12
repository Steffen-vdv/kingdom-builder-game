import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';

/**
 * Counts the total number of developments placed across
 * all of the active player's lands.
 */
export const developmentCountAllEvaluator: EvaluatorHandler<number> = (
	_definition,
	engineContext: EngineContext,
) => {
	return engineContext.activePlayer.lands.reduce(
		(total, land) => total + land.developments.length,
		0,
	);
};
