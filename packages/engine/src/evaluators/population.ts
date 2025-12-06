import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { PopulationRoleId } from '../state';
import { PopulationRole } from '@kingdom-builder/contents';
import { getResourceValue } from '../resource-v2';

export interface PopulationEvaluatorParams extends Record<string, unknown> {
	/** V2 resource identifier for the population role (optional to sum all) */
	resourceId?: PopulationRoleId;
}

export const populationEvaluator: EvaluatorHandler<
	number,
	PopulationEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const resourceId = definition.params?.resourceId as PopulationRoleId;
	if (resourceId) {
		return engineContext.activePlayer.resourceValues[resourceId] || 0;
	}
	// Sum all population role values using the PopulationRole enum
	let total = 0;
	for (const populationRoleId of Object.values(PopulationRole)) {
		total += getResourceValue(engineContext.activePlayer, populationRoleId);
	}
	return total;
};
