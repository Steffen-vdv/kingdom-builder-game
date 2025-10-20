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

const ACTION_ID_MAP = {
	build: 'build',
	army_attack: 'army_attack',
	develop: 'develop',
	expand: 'expand',
	hold_festival: 'hold_festival',
	plow: 'plow',
	plunder: 'plunder',
	raise_pop: 'raise_pop',
	royal_decree: 'royal_decree',
	tax: 'tax',
	till: 'till',
} as const;

const POPULATION_EVALUATION_ID_MAP = {
	tax: 'tax',
} as const;

export const ActionId = ACTION_ID_MAP;

export type ActionId = (typeof ACTION_ID_MAP)[keyof typeof ACTION_ID_MAP];

export const PopulationEvaluationId = POPULATION_EVALUATION_ID_MAP;

type PopulationEvaluationIdMap = typeof POPULATION_EVALUATION_ID_MAP;

export type PopulationEvaluationId =
	PopulationEvaluationIdMap[keyof PopulationEvaluationIdMap];

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
