import {
	actionSchema,
	type ActionConfig,
	Registry,
} from '@kingdom-builder/protocol';
import { registerBasicActions } from './actions/basicActions';
import { registerSpecialActions } from './actions/specialActions';
import { registerDevelopmentActions } from './actions/developmentActions';
import { registerBuildingActions } from './actions/buildingActions';
import {
	ActionCategoryId as ActionCategoryIds,
	type ActionCategoryId as ActionCategoryIdValue,
} from './actionCategories';
import type { BuildingId } from './buildingIds';
import type { Focus as FocusType } from './defs';
import type { ResourceKey } from './resources';

export * from './actionIds';

export interface ActionDef extends ActionConfig {
	category?: ActionCategoryIdValue;
	order?: number;
	focus?: FocusType;
	upkeep?: Partial<Record<ResourceKey, number>>;
	buildingId?: BuildingId;
}

export const ActionCategoryId = ActionCategoryIds;

export function createActionRegistry() {
	const registry = new Registry<ActionDef>(actionSchema.passthrough());

	registerBasicActions(registry);
	registerDevelopmentActions(registry);
	registerBuildingActions(registry);
	registerSpecialActions(registry);

	return registry;
}

export const ACTIONS = createActionRegistry();
