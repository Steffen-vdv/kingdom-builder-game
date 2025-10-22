import { actionSchema, type ActionConfig, Registry } from '@kingdom-builder/protocol';
import { registerBasicActions } from './actions/basicActions';
import { registerHireActions } from './actions/hireActions';
import { registerDevelopActions } from './actions/developActions';
import { registerBuildActions } from './actions/buildActions';
import { ActionCategoryId as ActionCategoryValues, type ActionCategoryId as ActionCategoryIdValue } from './actionCategories';
import type { Focus as FocusType } from './defs';
import {
	ActionId as ActionIdValues,
	BasicActionId as BasicActionIdMap,
	BuildActionId as BuildActionIdMap,
	DevelopActionId as DevelopActionIdMap,
	HireActionId as HireActionIdMap,
	DEVELOPMENT_ACTION_IDS,
	BUILDING_ACTION_IDS,
	POPULATION_ACTION_IDS,
	PopulationEvaluationId as PopulationEvaluationIdValues,
	type ActionId as ActionIdType,
	type BasicActionId as BasicActionIdType,
	type BuildingActionId as BuildingActionIdType,
	type DevelopmentActionId as DevelopmentActionIdType,
	type PopulationActionId as PopulationActionIdType,
	type PopulationEvaluationId as PopulationEvaluationIdType,
} from './actionIds';

export const ActionId = ActionIdValues;
export const ActionCategory = ActionCategoryValues;
export const BasicActions = BasicActionIdMap;
export const DevelopActions = DevelopActionIdMap;
export const HireActions = HireActionIdMap;
export const BuildActions = BuildActionIdMap;
export const PopulationEvaluationId = PopulationEvaluationIdValues;

export { DEVELOPMENT_ACTION_IDS, BUILDING_ACTION_IDS, POPULATION_ACTION_IDS };

export type ActionId = ActionIdType;
export type BasicActionId = BasicActionIdType;
export type DevelopmentActionId = DevelopmentActionIdType;
export type PopulationActionId = PopulationActionIdType;
export type BuildingActionId = BuildingActionIdType;
export type PopulationEvaluationId = PopulationEvaluationIdType;

export interface ActionDef extends ActionConfig {
	category?: ActionCategoryIdValue;
	order?: number;
	focus?: FocusType;
}

export function createActionRegistry() {
	const registry = new Registry<ActionDef>(actionSchema.passthrough());

	registerBasicActions(registry);
	registerHireActions(registry);
	registerDevelopActions(registry);
	registerBuildActions(registry);

	return registry;
}

export const ACTIONS = createActionRegistry();
