import type { Registry } from '@kingdom-builder/protocol';
import { action, effect, buildingParams } from '../config/builders';
import { BuildingMethods, Types } from '../config/builderShared';
import type { ActionDef } from '../actions';
import { actionIdForBuilding } from '../actionIds';
import { ACTION_CATEGORIES, ActionCategoryId } from '../actionCategories';
import { BUILDINGS } from '../buildings';
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

const buildCategoryOrder = resolveCategoryOrder();

export function registerBuildingActions(registry: Registry<ActionDef>) {
	const entries = BUILDINGS.entries();
	entries.forEach(([buildingId, buildingDefinition], index) => {
		const typedBuildingId = buildingId as BuildingId;
		const actionId = actionIdForBuilding(typedBuildingId);
		const builder = action()
			.id(actionId)
			.name(`Build: ${buildingDefinition.name}`)
			.category(ActionCategoryId.Build)
			.order(buildCategoryOrder + index + 1)
			.effect(
				effect(Types.Building, BuildingMethods.ADD)
					.params(buildingParams().id(typedBuildingId))
					.build(),
			);
		if (buildingDefinition.icon) {
			builder.icon(buildingDefinition.icon);
		}
		if (buildingDefinition.focus) {
			builder.focus(buildingDefinition.focus);
		}
		const costs = buildingDefinition.costs ?? {};
		Object.entries(costs).forEach(([resourceKey, amount]) => {
			builder.cost(resourceKey as ResourceKey, Number(amount ?? 0));
		});
		const actionDef = builder.build();
		if (buildingDefinition.upkeep) {
			actionDef.upkeep = { ...buildingDefinition.upkeep };
		}
		actionDef.buildingId = typedBuildingId;
		registry.add(actionId, actionDef);
	});
}
