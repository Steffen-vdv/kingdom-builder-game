import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resources';
import { Stat } from '../stats';
import { DevelopmentId } from '../developments';
import { ACTION_CATEGORIES, ActionCategoryId } from '../actionCategories';
import type { ActionCategoryId as ActionCategoryIdValue } from '../actionCategories';
import {
	action,
	compareRequirement,
	effect,
	populationEvaluator,
	resourceParams,
	statEvaluator,
	developmentParams,
	actionParams,
	populationParams,
} from '../config/builders';
import {
	actionEffectGroup,
	actionEffectGroupOption,
} from '../config/builders/actionEffectGroups';
import {
	ActionMethods,
	DevelopmentMethods,
	LandMethods,
	ResourceMethods,
	Types,
	PopulationMethods,
} from '../config/builderShared';
import { Focus } from '../defs';
import type { ActionDef } from '../actions';
import { ActionId, PopulationEvaluationId } from '../actions';

const categoryOrder = (categoryId: ActionCategoryIdValue, offset: number) => {
	const category = ACTION_CATEGORIES.get(categoryId);
	return category.order * 10 + offset;
};

export function registerBasicActions(registry: Registry<ActionDef>) {
	registry.add(
		ActionId.expand,
		action()
			.id(ActionId.expand)
			.name('Expand')
			.icon('🌱')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 2)
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(
				effect(Types.Resource, ResourceMethods.ADD)
					.params(resourceParams().key(Resource.happiness).amount(1))
					.build(),
			)
			.category(ActionCategoryId.Basic)
			.order(categoryOrder(ActionCategoryId.Basic, 1))
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.develop,
		action()
			.id(ActionId.develop)
			.name('Develop')
			.icon('🏗️')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.effect(
				effect(Types.Development, DevelopmentMethods.ADD)
					.params(developmentParams().id('$id').landId('$landId'))
					.build(),
			)
			.category(ActionCategoryId.Develop)
			.order(categoryOrder(ActionCategoryId.Develop, 1))
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.tax,
		action()
			.id(ActionId.tax)
			.name('Tax')
			.icon('💰')
			.cost(Resource.ap, 1)
			.effect(
				effect()
					.evaluator(populationEvaluator().id(PopulationEvaluationId.tax))
					.effect(
						effect(Types.Resource, ResourceMethods.ADD)
							.params(resourceParams().key(Resource.gold).amount(4))
							.build(),
					)
					.effect(
						effect(Types.Resource, ResourceMethods.REMOVE)
							.round('up')
							.params(resourceParams().key(Resource.happiness).amount(0.5))
							.allowShortfall()
							.build(),
					)
					.build(),
			)
			.category(ActionCategoryId.Basic)
			.order(categoryOrder(ActionCategoryId.Basic, 3))
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.raise_pop,
		action()
			.id(ActionId.raise_pop)
			.name('Hire')
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
					.params(populationParams().role('$role'))
					.build(),
			)
			.effect(
				effect(Types.Resource, ResourceMethods.ADD)
					.params(resourceParams().key(Resource.happiness).amount(1))
					.build(),
			)
			.category(ActionCategoryId.Hire)
			.order(categoryOrder(ActionCategoryId.Hire, 1))
			.focus(Focus.Economy)
			.build(),
	);

	const royalDecreeDevelopGroup = actionEffectGroup('royal_decree_develop')
		.layout('compact')
		.option(
			actionEffectGroupOption('royal_decree_house')
				.icon('🏠')
				.action(ActionId.develop)
				.paramDevelopmentId(DevelopmentId.House)
				.paramLandId('$landId'),
		)
		.option(
			actionEffectGroupOption('royal_decree_farm')
				.icon('🌾')
				.action(ActionId.develop)
				.paramDevelopmentId(DevelopmentId.Farm)
				.paramLandId('$landId'),
		)
		.option(
			actionEffectGroupOption('royal_decree_outpost')
				.icon('🏹')
				.action(ActionId.develop)
				.paramDevelopmentId(DevelopmentId.Outpost)
				.paramLandId('$landId'),
		)
		.option(
			actionEffectGroupOption('royal_decree_watchtower')
				.icon('🗼')
				.action(ActionId.develop)
				.paramDevelopmentId(DevelopmentId.Watchtower)
				.paramLandId('$landId'),
		);

	registry.add(
		ActionId.royal_decree,
		action()
			.id(ActionId.royal_decree)
			.name('Royal Decree')
			.icon('📜')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 12)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ActionId.expand))
					.build(),
			)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ActionId.till).landId('$landId'))
					.build(),
			)
			.effectGroup(royalDecreeDevelopGroup)
			.effect(
				effect(Types.Resource, ResourceMethods.REMOVE)
					.params(resourceParams().key(Resource.happiness).amount(3))
					.allowShortfall()
					.build(),
			)
			.category(ActionCategoryId.Basic)
			.order(categoryOrder(ActionCategoryId.Basic, 5))
			.focus(Focus.Economy)
			.build(),
	);
}
