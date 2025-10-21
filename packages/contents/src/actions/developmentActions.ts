import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resources';
import { action, effect, developmentParams } from '../config/builders';
import { DevelopmentMethods, Types } from '../config/builderShared';
import type { ActionDef } from '../actions';
import { actionIdForDevelopment } from '../actionIds';
import { ACTION_CATEGORIES, ActionCategoryId } from '../actionCategories';
import { DevelopmentId, DEVELOPMENTS } from '../developments';

const DEVELOPMENT_ACTION_ORDER: DevelopmentId[] = [
	DevelopmentId.House,
	DevelopmentId.Farm,
	DevelopmentId.Outpost,
	DevelopmentId.Watchtower,
	DevelopmentId.Garden,
];

function resolveCategoryOrder(categoryId: ActionCategoryId) {
	const category = ACTION_CATEGORIES.get(categoryId);
	if (!category) {
		throw new Error(
			`Missing action category definition for id "${categoryId}".`,
		);
	}
	return category.order;
}

const developCategoryOrder = resolveCategoryOrder(ActionCategoryId.Develop);

export function registerDevelopmentActions(registry: Registry<ActionDef>) {
	DEVELOPMENT_ACTION_ORDER.forEach((developmentId, index) => {
		const development = DEVELOPMENTS.get(developmentId);
		if (!development) {
			throw new Error(
				`Missing development definition for id "${developmentId}" while registering actions.`,
			);
		}
		const actionId = actionIdForDevelopment(developmentId);
		const builder = action()
			.id(actionId)
			.name(`Develop: ${development.name}`)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.effect(
				effect(Types.Development, DevelopmentMethods.ADD)
					.params(developmentParams().id(developmentId).landId('$landId'))
					.build(),
			)
			.category(ActionCategoryId.Develop)
			.order(developCategoryOrder + (development.order ?? index + 1));
		if (development.icon) {
			builder.icon(development.icon);
		}
		if (development.focus) {
			builder.focus(development.focus);
		}
		if (developmentId === DevelopmentId.Garden) {
			builder.system();
		}
		registry.add(actionId, builder.build());
	});
}
