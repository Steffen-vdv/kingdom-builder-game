import {
	actionSchema,
	type ActionConfig,
	Registry,
} from '@kingdom-builder/protocol';
import { registerBasicActions } from './actions/basicActions';
import { registerSpecialActions } from './actions/specialActions';
import { registerBuildingActions } from './actions/buildingActions';
import { registerDevelopmentActions } from './actions/developmentActions';
import {
	ActionCategoryId as ActionCategoryIds,
	type ActionCategoryId as ActionCategoryIdValue,
} from './actionCategories';
import type { Focus as FocusType } from './defs';
import { actionIdForBuilding } from './actionIds';

export * from './actionIds';

export interface ActionDef extends ActionConfig {
	category?: ActionCategoryIdValue;
	order?: number;
	focus?: FocusType;
}

export const ActionCategoryId = ActionCategoryIds;

export function createActionRegistry() {
	const registry = new Registry<ActionDef>(actionSchema.passthrough());

	registerBasicActions(registry);
	registerDevelopmentActions(registry);
	registerBuildingActions(registry, actionIdForBuilding);
	registerSpecialActions(registry);

	return registry;
}

export const ACTIONS = createActionRegistry();
