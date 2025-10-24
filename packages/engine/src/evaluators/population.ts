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
		const resourceId =
			engineContext.activePlayer.getPopulationResourceV2Id(role);
		const value = engineContext.activePlayer.resourceValues[resourceId];
		return typeof value === 'number' ? value : 0;
	}
	const catalog = engineContext.resourceCatalogV2;
	if (catalog) {
		let total = 0;
		let matched = false;
		for (const definition of catalog.resources.ordered) {
			if (!definition.id.startsWith('resource:population:role:')) {
				continue;
			}
			matched = true;
			const value = engineContext.activePlayer.resourceValues[definition.id];
			total += Number(value || 0);
		}
		if (matched) {
			return total;
		}
	}
	return Object.values(engineContext.activePlayer.population).reduce(
		(total, count) => total + Number(count || 0),
		0,
	);
};
