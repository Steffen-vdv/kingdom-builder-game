import {
	actionSchema,
	type ActionConfig,
	Registry,
} from '@kingdom-builder/protocol';
import { registerBasicActions } from './actions/basicActions';
import { registerSpecialActions } from './actions/specialActions';
import {
	ActionCategoryId as ActionCategoryIds,
	type ActionCategoryId as ActionCategoryIdValue,
} from './actionCategories';
import type { Focus as FocusType } from './defs';
import {
	ActionId as ActionIdMap,
	BUILDING_ACTION_ID_BY_BUILDING_ID,
	BUILDING_ACTION_IDS,
	DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID,
	DEVELOPMENT_ACTION_IDS,
	POPULATION_ACTION_ID_BY_ROLE,
	POPULATION_ACTION_IDS,
	PopulationEvaluationId as PopulationEvaluationIdMap,
} from './actionIds';
import type {
	ActionId as ActionIdType,
	PopulationEvaluationId as PopulationEvaluationIdType,
} from './actionIds';

export {
	BUILDING_ACTION_ID_BY_BUILDING_ID,
	BUILDING_ACTION_IDS,
	DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID,
	DEVELOPMENT_ACTION_IDS,
	POPULATION_ACTION_ID_BY_ROLE,
	POPULATION_ACTION_IDS,
};
export const ActionId = ActionIdMap;
export const PopulationEvaluationId = PopulationEvaluationIdMap;
export type {
	BuildingActionId,
	BuildingActionIdMap,
	DevelopmentActionId,
	DevelopmentActionIdMap,
	PopulationActionId,
	PopulationActionIdMap,
} from './actionIds';

export type ActionId = ActionIdType;
export type PopulationEvaluationId = PopulationEvaluationIdType;

export interface ActionDef extends ActionConfig {
	category?: ActionCategoryIdValue;
	order?: number;
	focus?: FocusType;
}

export const ActionCategoryId = ActionCategoryIds;

export function createActionRegistry() {
	const registry = new Registry<ActionDef>(actionSchema.passthrough());

	registerBasicActions(registry);
	registerSpecialActions(registry);

	return registry;
}

export const ACTIONS = createActionRegistry();
