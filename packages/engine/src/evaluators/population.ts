import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { PopulationRoleId } from '../state';
import { PopulationRole } from '@kingdom-builder/contents';
import { getResourceValue } from '../resource-v2';

export interface PopulationEvaluatorParams extends Record<string, unknown> {
	/** V2 resource identifier for the population role */
	resourceId?: PopulationRoleId;
	/** @deprecated Use resourceId instead */
	role?: PopulationRoleId;
}

export const populationEvaluator: EvaluatorHandler<
	number,
	PopulationEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	// V2 resourceId takes precedence over legacy role
	const roleId =
		(definition.params?.resourceId as PopulationRoleId) ||
		(definition.params?.role as PopulationRoleId);
	if (roleId) {
		// roleId is now a ResourceV2 ID - use resourceValues directly
		return engineContext.activePlayer.resourceValues[roleId] || 0;
	}
	// Sum all population role values using the PopulationRole enum
	let total = 0;
	for (const populationRoleId of Object.values(PopulationRole)) {
		total += getResourceValue(engineContext.activePlayer, populationRoleId);
	}
	return total;
};
