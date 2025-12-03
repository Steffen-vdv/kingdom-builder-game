import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { PopulationRoleId } from '../state';

export interface PopulationEvaluatorParams extends Record<string, unknown> {
	role?: PopulationRoleId;
}

export const populationEvaluator: EvaluatorHandler<
	number,
	PopulationEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const role = definition.params?.role;
	if (role) {
		return engineContext.activePlayer.population[role] || 0;
	}
	return Object.values(engineContext.activePlayer.population).reduce<number>(
		(total, count) => total + Number(count || 0),
		0,
	);
};
