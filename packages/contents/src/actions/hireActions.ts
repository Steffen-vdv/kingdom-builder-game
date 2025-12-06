import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resourceKeys';
import { Stat } from '../stats';
import { POPULATIONS } from '../populations';
import type { ActionDef } from '../actions';
import { HireActionId } from '../actionIds';
import type { PopulationActionId } from '../actionIds';
import { ActionCategoryId as ActionCategory, ACTION_CATEGORIES } from '../actionCategories';
import { action, compareRequirement, effect, populationParams, resourceEvaluator } from '../config/builders';
import { Types, PopulationMethods, ResourceMethods } from '../config/builderShared';
import { Focus } from '../defs';
import { PopulationRole } from '../populationRoles';
import type { PopulationRoleId } from '../populationRoles';
import { resourceAmountChange } from '../helpers/resourceV2Effects';

const HAPPINESS_REWARD_AMOUNT = 1;

interface HireActionConfig {
	id: PopulationActionId;
	role: PopulationRoleId;
	orderOffset: number;
}

const categoryOrder = (categoryId: keyof typeof ActionCategory) => {
	const category = ACTION_CATEGORIES.get(ActionCategory[categoryId]);
	if (!category) {
		throw new Error(`Missing action category definition for id "${ActionCategory[categoryId]}".`);
	}
	return category.order ?? 0;
};

const hireCategoryOrder = categoryOrder('Hire');

// Compare total population (parent aggregates children) vs max population capacity
const populationCapacityRequirement = compareRequirement().left(resourceEvaluator().resourceId(Stat.populationTotal)).operator('lt').right(resourceEvaluator().resourceId(Stat.populationMax)).build();

const hireActionConfigs: readonly HireActionConfig[] = [
	{ id: HireActionId.hire_council, role: PopulationRole.Council, orderOffset: 0 },
	{ id: HireActionId.hire_legion, role: PopulationRole.Legion, orderOffset: 1 },
	{ id: HireActionId.hire_fortifier, role: PopulationRole.Fortifier, orderOffset: 2 },
];

function requirePopulation(role: PopulationRoleId): { name: string; icon: string } {
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

function createHireEffects(role: PopulationRoleId) {
	const populationEffect = effect(Types.Population, PopulationMethods.ADD).params(populationParams().role(role)).build();
	const happinessParams = resourceAmountChange(Resource.happiness, HAPPINESS_REWARD_AMOUNT);
	const happinessEffect = effect(Types.Resource, ResourceMethods.ADD).params(happinessParams).build();
	return { populationEffect, happinessEffect };
}

export function registerHireActions(registry: Registry<ActionDef>) {
	hireActionConfigs.forEach(({ id, role, orderOffset }) => {
		const { name, icon } = requirePopulation(role);
		const { populationEffect, happinessEffect } = createHireEffects(role);
		registry.add(
			id,
			action()
				.id(id)
				.name(`Hire ${name}`)
				.icon(icon)
				.cost(Resource.gold, 5)
				.requirement(populationCapacityRequirement)
				.effect(populationEffect)
				.effect(happinessEffect)
				.category(ActionCategory.Hire)
				.order(hireCategoryOrder + orderOffset)
				.focus(Focus.Economy)
				.build(),
		);
	});
}
