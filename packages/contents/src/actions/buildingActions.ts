import type { Registry } from '@kingdom-builder/protocol';
import { BUILDINGS } from '../buildings';
import { ACTION_CATEGORIES, ActionCategoryId } from '../actionCategories';
import { action, effect, buildingParams } from '../config/builders';
import { BuildingMethods, Types } from '../config/builderShared';
import type { ActionDef, BuildingActionId } from '../actions';
import type { BuildingId } from '../buildingIds';
import type { ResourceKey } from '../resources';

function resolveCategoryOrder(categoryId: ActionCategoryId) {
	const category = ACTION_CATEGORIES.get(categoryId);
	if (!category) {
		throw new Error(
			`Missing action category definition for id "${categoryId}".`,
		);
	}
	return category.order;
}

const buildCategoryOrder = resolveCategoryOrder(ActionCategoryId.Build);

const BUILDING_ACTION_ORDER: BuildingId[] = BUILDINGS.keys().map(
	(entry) => entry as BuildingId,
);

type BuildingActionResolver = (buildingId: BuildingId) => BuildingActionId;

export function registerBuildingActions(
	registry: Registry<ActionDef>,
	resolveActionId: BuildingActionResolver,
) {
	BUILDING_ACTION_ORDER.forEach((buildingId, index) => {
		const building = BUILDINGS.get(buildingId);
		if (!building) {
			throw new Error(
				`Missing building definition for id "${buildingId}" while registering actions.`,
			);
		}
		const actionId = resolveActionId(buildingId);
		const builder = action()
			.id(actionId)
			.name(`Build: ${building.name}`)
			.category(ActionCategoryId.Build)
			.order(buildCategoryOrder + index + 1)
			.effect(
				effect(Types.Building, BuildingMethods.ADD)
					.params(buildingParams().id(buildingId))
					.build(),
			);
		if (building.icon) {
			builder.icon(building.icon);
		}
		if (building.focus) {
			builder.focus(building.focus);
		}
		const costs = building.costs ?? {};
		const costEntries = Object.entries(costs) as [
			ResourceKey,
			number | undefined,
		][];
		for (const [resourceKey, amount] of costEntries) {
			builder.cost(resourceKey, amount ?? 0);
		}
		registry.add(actionId, builder.build());
	});
}
