import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resources';
import { Stat } from '../stats';
import { POPULATIONS } from '../populations';
import type { ActionDef } from '../actions';
import { HireActionId } from '../actionIds';
import { ActionCategoryId as ActionCategory, ACTION_CATEGORIES } from '../actionCategories';
import { action, compareRequirement, effect, populationEvaluator, populationParams, resourceParams, statEvaluator } from '../config/builders';
import { Types, PopulationMethods, ResourceMethods } from '../config/builderShared';
import { Focus } from '../defs';
import { PopulationRole } from '../populationRoles';
import type { PopulationRoleId } from '../populationRoles';

const categoryOrder = (categoryId: keyof typeof ActionCategory) => {
	const category = ACTION_CATEGORIES.get(ActionCategory[categoryId]);
	if (!category) {
		throw new Error(`Missing action category definition for id "${ActionCategory[categoryId]}".`);
	}
	return category.order ?? 0;
};

const hireCategoryOrder = categoryOrder('Hire');

const populationCapacityRequirement = compareRequirement().left(populationEvaluator()).operator('lt').right(statEvaluator().key(Stat.maxPopulation)).build();

function requirePopulation(role: PopulationRoleId) {
	const definition = POPULATIONS.get(role);
	if (!definition) {
		throw new Error(`Missing population definition for id "${role}".`);
	}
	const { name, icon } = definition;
	if (!name) {
		throw new Error(`Missing name for population definition "${role}".`);
	}
	if (!icon) {
		throw new Error(`Missing icon for population definition "${role}".`);
	}
	return { name, icon };
}

export function registerHireActions(registry: Registry<ActionDef>) {
	const council = requirePopulation(PopulationRole.Council);
	registry.add(
		HireActionId.hire_council,
		action()
			.id(HireActionId.hire_council)
			.name(`Hire ${council.name}`)
			.icon(council.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.requirement(populationCapacityRequirement)
			.effect(effect(Types.Population, PopulationMethods.ADD).params(populationParams().role(PopulationRole.Council)).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceParams().key(Resource.happiness).amount(1)).build())
			.category(ActionCategory.Hire)
			.order(hireCategoryOrder + 0)
			.focus(Focus.Economy)
			.build(),
	);

	const legion = requirePopulation(PopulationRole.Legion);
	registry.add(
		HireActionId.hire_legion,
		action()
			.id(HireActionId.hire_legion)
			.name(`Hire ${legion.name}`)
			.icon(legion.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.requirement(populationCapacityRequirement)
			.effect(effect(Types.Population, PopulationMethods.ADD).params(populationParams().role(PopulationRole.Legion)).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceParams().key(Resource.happiness).amount(1)).build())
			.category(ActionCategory.Hire)
			.order(hireCategoryOrder + 1)
			.focus(Focus.Economy)
			.build(),
	);

	const fortifier = requirePopulation(PopulationRole.Fortifier);
	registry.add(
		HireActionId.hire_fortifier,
		action()
			.id(HireActionId.hire_fortifier)
			.name(`Hire ${fortifier.name}`)
			.icon(fortifier.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.requirement(populationCapacityRequirement)
			.effect(effect(Types.Population, PopulationMethods.ADD).params(populationParams().role(PopulationRole.Fortifier)).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceParams().key(Resource.happiness).amount(1)).build())
			.category(ActionCategory.Hire)
			.order(hireCategoryOrder + 2)
			.focus(Focus.Economy)
			.build(),
	);
}
