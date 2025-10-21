import type { Registry } from '@kingdom-builder/protocol';
import { action, buildingParams, effect } from '../config/builders';
import { BuildingMethods, Types } from '../config/builderShared';
import type { ActionDef } from '../actions';
import { BUILDINGS } from '../buildings';
import { ACTION_CATEGORIES, ActionCategoryId } from '../actionCategories';
import type { BuildingId } from '../buildingIds';
import type { ResourceKey } from '../resources';

function resolveCategoryOrder() {
	const category = ACTION_CATEGORIES.get(ActionCategoryId.Build);
	if (!category) {
		throw new Error(
			`Missing action category definition for id "${ActionCategoryId.Build}".`,
		);
	}
	return category.order;
}

export function registerBuildingActions(
	registry: Registry<ActionDef>,
	resolveActionId: (buildingId: BuildingId) => string,
) {
	const baseOrder = resolveCategoryOrder();
	const entries = BUILDINGS.entries();
	entries.forEach(([rawBuildingId, definition], index) => {
		const buildingId = rawBuildingId as BuildingId;
		const actionId = resolveActionId(buildingId);
		const builder = action()
			.id(actionId)
			.name(`Build: ${definition.name}`)
			.effect(
				effect(Types.Building, BuildingMethods.ADD)
					.params(buildingParams().id(buildingId))
					.build(),
			)
			.category(ActionCategoryId.Build)
			.order(baseOrder + index + 1);
		if (definition.icon) {
			builder.icon(definition.icon);
		}
		if (definition.focus) {
			builder.focus(definition.focus);
		}
		for (const [resourceKey, amount] of Object.entries(definition.costs)) {
			if (amount === undefined) {
				continue;
			}
			builder.cost(resourceKey as ResourceKey, amount);
		}
		registry.add(actionId, builder.build());
	});
}
