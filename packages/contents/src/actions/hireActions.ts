import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resourceKeys';
import { Stat } from '../stats';
import { POPULATIONS } from '../populations';
import type { ActionDef } from '../actions';
import { HireActionId } from '../actionIds';
import type { PopulationActionId } from '../actionIds';
import { ActionCategoryId as ActionCategory, ACTION_CATEGORIES } from '../actionCategories';
import { action, compareRequirement, effect, resourceEvaluator } from '../config/builders';
import { Types, ResourceMethods } from '../config/builderShared';
import { resourceChange } from '../resourceV2';
import { Focus } from '../defs';
import { PopulationRole } from '../populationRoles';
import { resourceAmountChange } from '../helpers/resourceV2Effects';

const HAPPINESS_REWARD_AMOUNT = 1;

interface HireActionConfig {
	id: PopulationActionId;
	/** V2 resource ID to add when this action is performed */
	resourceId: string;
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
	{ id: HireActionId.hire_council, resourceId: PopulationRole.Council, orderOffset: 0 },
	{ id: HireActionId.hire_legion, resourceId: PopulationRole.Legion, orderOffset: 1 },
	{ id: HireActionId.hire_fortifier, resourceId: PopulationRole.Fortifier, orderOffset: 2 },
];

function requirePopulationMetadata(resourceId: string): { name: string; icon: string } {
	const definition = POPULATIONS.get(resourceId);
	if (!definition) {
		throw new Error(`Missing population definition for resource "${resourceId}".`);
	}
	const { name, icon } = definition;
	if (!name) {
		throw new Error(`Missing name for population resource "${resourceId}".`);
	}
	if (!icon) {
		throw new Error(`Missing icon for population resource "${resourceId}".`);
	}
	return { name, icon };
}

function createHireEffects(resourceId: string) {
	const populationEffect = effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(resourceId).amount(1).build()).build();
	const happinessParams = resourceAmountChange(Resource.happiness, HAPPINESS_REWARD_AMOUNT);
	const happinessEffect = effect(Types.Resource, ResourceMethods.ADD).params(happinessParams).build();
	return { populationEffect, happinessEffect };
}

export function registerHireActions(registry: Registry<ActionDef>) {
	hireActionConfigs.forEach(({ id, resourceId, orderOffset }) => {
		const { name, icon } = requirePopulationMetadata(resourceId);
		const { populationEffect, happinessEffect } = createHireEffects(resourceId);
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
