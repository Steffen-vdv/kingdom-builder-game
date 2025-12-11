import { actionSchema, type ActionConfig, Registry } from '@kingdom-builder/protocol';
import { registerBasicActions } from './actions/basicActions';
import { registerHireActions } from './actions/hireActions';
import { registerDevelopActions } from './actions/developActions';
import { registerBuildActions } from './actions/buildActions';
import { registerInitialSetupActions } from './actions/initialSetupActions';
import { ActionCategoryId as ActionCategoryValues, type ActionCategoryId as ActionCategoryIdValue } from './actionCategories';
import type { Focus as FocusType } from './defs';
import {
	ActionId as ActionIdValues,
	BasicActionId as BasicActionIdMap,
	BuildActionId as BuildActionIdMap,
	DevelopActionId as DevelopActionIdMap,
	HireActionId as HireActionIdMap,
	SystemActionId as SystemActionIdMap,
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
	type SystemActionId as SystemActionIdType,
} from './actionIds';

export const ActionId = ActionIdValues;
export const ActionCategory = ActionCategoryValues;
export const BasicActions = BasicActionIdMap;
export const DevelopActions = DevelopActionIdMap;
export const HireActions = HireActionIdMap;
export const BuildActions = BuildActionIdMap;
export const SystemActions = SystemActionIdMap;
export const PopulationEvaluationId = PopulationEvaluationIdValues;

export { DEVELOPMENT_ACTION_IDS, BUILDING_ACTION_IDS, POPULATION_ACTION_IDS };

export type ActionId = ActionIdType;
export type BasicActionId = BasicActionIdType;
export type DevelopmentActionId = DevelopmentActionIdType;
export type PopulationActionId = PopulationActionIdType;
export type BuildingActionId = BuildingActionIdType;
export type SystemActionId = SystemActionIdType;
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
	registerInitialSetupActions(registry);

	return registry;
}

export const ACTIONS = createActionRegistry();

/**
 * Metadata for the "Action" concept as a keyword.
 * Used in modifier translations and UI when referring to actions generically.
 */
export const ACTION_INFO = {
	icon: '🎯',
	label: 'Action',
	plural: 'Actions',
} as const;
