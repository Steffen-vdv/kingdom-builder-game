import type { EvaluatorHandler } from './index';
import type { EngineContext } from '../context';
import type { PopulationRoleId } from '../state';
import { PopulationRole } from '@kingdom-builder/contents';
import { getResourceValue } from '../resource-v2';

export interface PopulationEvaluatorParams extends Record<string, unknown> {
	role?: PopulationRoleId;
}

export const populationEvaluator: EvaluatorHandler<
	number,
	PopulationEvaluatorParams
> = (definition, engineContext: EngineContext) => {
	const role = definition.params?.role;
	if (role) {
		// role is now a ResourceV2 ID - use resourceValues directly
		return engineContext.activePlayer.resourceValues[role] || 0;
	}
	// Sum all population role values using the PopulationRole enum
	let total = 0;
	for (const roleId of Object.values(PopulationRole)) {
		total += getResourceValue(engineContext.activePlayer, roleId);
	}
	return total;
};
