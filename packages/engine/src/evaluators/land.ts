import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';

export const landEvaluator: EvaluatorHandler<number> = (
	_definition,
	engineContext: EngineContext,
) =>
	engineContext.activePlayer.lands.reduce(
		(total, land) => total + Math.max(0, land.slotsMax - land.slotsUsed),
		0,
	);
