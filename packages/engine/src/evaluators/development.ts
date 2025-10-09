import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';

export interface DevelopmentEvaluatorParams extends Record<string, unknown> {
	id: string;
}

export const developmentEvaluator: EvaluatorHandler<
	number,
	DevelopmentEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const { id } = definition.params!;
	return engineContext.activePlayer.lands.reduce(
		(total, land) =>
			total +
			land.developments.filter((development) => development === id).length,
		0,
	);
};
