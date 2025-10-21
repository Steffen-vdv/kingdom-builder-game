import type { Registry } from '@kingdom-builder/protocol';
import {
	action,
	compareRequirement,
	effect,
	populationParams,
	populationEvaluator,
	resourceParams,
	statEvaluator,
} from '../config/builders';
import {
	PopulationMethods,
	ResourceMethods,
	Types,
} from '../config/builderShared';
import type { ActionDef } from '../actions';
import { ACTION_CATEGORIES, ActionCategoryId } from '../actionCategories';
import {
	actionIdForHireableRole,
	HIREABLE_POPULATION_ROLE_IDS,
	type HireablePopulationRoleId,
} from '../actionIds';
import { POPULATION_ROLES, type PopulationRoleId } from '../populationRoles';
import { Resource } from '../resources';
import { Stat } from '../stats';
import { Focus } from '../defs';

function resolveHireCategoryOrder() {
	const category = ACTION_CATEGORIES.get(ActionCategoryId.Hire);
	if (!category) {
		throw new Error(
			`Missing action category definition for id "${ActionCategoryId.Hire}".`,
		);
	}
	return category.order;
}

const hireCategoryOrder = resolveHireCategoryOrder();
const hireableRoleSet = new Set<string>(HIREABLE_POPULATION_ROLE_IDS);
type PopulationRoleDefinition = (typeof POPULATION_ROLES)[PopulationRoleId];

function resolveActionId(roleId: PopulationRoleId): string {
	if (hireableRoleSet.has(roleId)) {
		return actionIdForHireableRole(roleId as HireablePopulationRoleId);
	}
	return `hire:${roleId}`;
}

export function registerHireActions(registry: Registry<ActionDef>) {
	const entries = Object.entries(POPULATION_ROLES) as Array<
		[PopulationRoleId, PopulationRoleDefinition]
	>;
	entries.forEach(([roleId, roleDefinition], index) => {
		const actionId = resolveActionId(roleId);
		const builder = action()
			.id(actionId)
			.name(`Hire ${roleDefinition.label}`)
			.icon('👶')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.requirement(
				compareRequirement()
					.left(populationEvaluator())
					.operator('lt')
					.right(statEvaluator().key(Stat.maxPopulation))
					.build(),
			)
			.effect(
				effect(Types.Population, PopulationMethods.ADD)
					.params(populationParams().role(roleId))
					.build(),
			)
			.effect(
				effect(Types.Resource, ResourceMethods.ADD)
					.params(resourceParams().key(Resource.happiness).amount(1))
					.build(),
			)
			.category(ActionCategoryId.Hire)
			.order(hireCategoryOrder + index + 1)
			.focus(Focus.Economy);
		if (!hireableRoleSet.has(roleId)) {
			builder.system();
		}
		registry.add(actionId, builder.build());
	});
}
