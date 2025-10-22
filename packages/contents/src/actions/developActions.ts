import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resources';
import { DevelopmentId, DEVELOPMENTS } from '../developments';
import type { ActionDef } from '../actions';
import { Focus } from '../defs';
import { DevelopActionId } from '../actionIds';
import { ActionCategoryId as ActionCategory, ACTION_CATEGORIES } from '../actionCategories';
import { action, compareRequirement, developmentParams, effect, landEvaluator } from '../config/builders';
import { Types, DevelopmentMethods } from '../config/builderShared';

const categoryOrder = (categoryId: keyof typeof ActionCategory) => {
	const category = ACTION_CATEGORIES.get(ActionCategory[categoryId]);
	if (!category) {
		throw new Error(`Missing action category definition for id "${ActionCategory[categoryId]}".`);
	}
	return category.order ?? 0;
};

const developCategoryOrder = categoryOrder('Develop');

const developmentSlotRequirement = compareRequirement().left(landEvaluator()).operator('gt').right(0).message('Requires an available development slot.').build();

function requireDevelopment(id: DevelopmentId) {
	const definition = DEVELOPMENTS.get(id);
	if (!definition) {
		throw new Error(`Missing development definition for id "${id}".`);
	}
	const { name, icon, focus } = definition;
	if (!name) {
		throw new Error(`Missing name for development definition "${id}".`);
	}
	if (!icon) {
		throw new Error(`Missing icon for development definition "${id}".`);
	}
	return { name, icon, focus };
}

export function registerDevelopActions(registry: Registry<ActionDef>) {
	const house = requireDevelopment(DevelopmentId.House);
	registry.add(
		DevelopActionId.develop_house,
		action()
			.id(DevelopActionId.develop_house)
			.name(house.name)
			.icon(house.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.House).landId('$landId')).build())
			.category(ActionCategory.Develop)
			.order(developCategoryOrder + 0)
			.focus(house.focus ?? Focus.Economy)
			.build(),
	);

	const farm = requireDevelopment(DevelopmentId.Farm);
	registry.add(
		DevelopActionId.develop_farm,
		action()
			.id(DevelopActionId.develop_farm)
			.name(farm.name)
			.icon(farm.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Farm).landId('$landId')).build())
			.category(ActionCategory.Develop)
			.order(developCategoryOrder + 1)
			.focus(farm.focus ?? Focus.Economy)
			.build(),
	);

	const outpost = requireDevelopment(DevelopmentId.Outpost);
	registry.add(
		DevelopActionId.develop_outpost,
		action()
			.id(DevelopActionId.develop_outpost)
			.name(outpost.name)
			.icon(outpost.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Outpost).landId('$landId')).build())
			.category(ActionCategory.Develop)
			.order(developCategoryOrder + 2)
			.focus(outpost.focus ?? Focus.Economy)
			.build(),
	);

	const watchtower = requireDevelopment(DevelopmentId.Watchtower);
	registry.add(
		DevelopActionId.develop_watchtower,
		action()
			.id(DevelopActionId.develop_watchtower)
			.name(watchtower.name)
			.icon(watchtower.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Watchtower).landId('$landId')).build())
			.category(ActionCategory.Develop)
			.order(developCategoryOrder + 3)
			.focus(watchtower.focus ?? Focus.Economy)
			.build(),
	);
}
