import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resources';
import { Stat } from '../stats';
import { DevelopmentId, DEVELOPMENTS } from '../developments';
import type { DevelopmentDef } from '../developments';
import { POPULATIONS } from '../populations';
import type { PopulationDef } from '../populations';
import type { PopulationRoleId } from '../populationRoles';
import {
	action,
	compareRequirement,
	effect,
	landEvaluator,
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
import {
	ActionId,
	DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID,
	POPULATION_ACTION_ID_BY_ROLE,
	PopulationEvaluationId,
	type ActionDef,
	type DevelopmentActionId,
	type PopulationActionId,
} from '../actions';
import {
	ACTION_CATEGORIES,
	ActionCategoryId,
	type ActionCategoryId as ActionCategoryIdValue,
} from '../actionCategories';

const categoryOrder = (categoryId: ActionCategoryIdValue) => {
	const category = ACTION_CATEGORIES.get(categoryId);
	if (!category) {
		throw new Error(
			`Missing action category definition for id "${categoryId}".`,
		);
	}
	return category.order;
};

const basicCategoryOrder = categoryOrder(ActionCategoryId.Basic);
const hireCategoryOrder = categoryOrder(ActionCategoryId.Hire);
const developCategoryOrder = categoryOrder(ActionCategoryId.Develop);

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
			.order(basicCategoryOrder + 1)
			.focus(Focus.Economy)
			.build(),
	);

	const developmentEntries: {
		actionId: DevelopmentActionId;
		developmentId: DevelopmentId;
		definition: DevelopmentDef;
	}[] = (
		Object.entries(DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID) as [
			DevelopmentId,
			DevelopmentActionId,
		][]
	)
		.map(([developmentId, actionId]) => {
			const definition = DEVELOPMENTS.get(developmentId);
			if (!definition) {
				throw new Error(
					`Missing development definition for id "${developmentId}".`,
				);
			}
			return { actionId, developmentId, definition };
		})
		.filter(({ definition }) => !definition.system)
		.sort((left, right) => {
			const leftOrder = left.definition.order ?? 0;
			const rightOrder = right.definition.order ?? 0;
			if (leftOrder !== rightOrder) {
				return leftOrder - rightOrder;
			}
			return left.definition.name.localeCompare(right.definition.name);
		});

	let developmentOrderOffset = 0;
	const developmentSlotRequirement = compareRequirement()
		.left(landEvaluator())
		.operator('gt')
		.right(0)
		.message('Requires an available development slot.')
		.build();
	for (const { actionId, developmentId, definition } of developmentEntries) {
		if (!definition.icon) {
			throw new Error(
				`Missing icon for development definition "${developmentId}".`,
			);
		}
		const builder = action()
			.id(actionId)
			.name(definition.name)
			.icon(definition.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(
				effect(Types.Development, DevelopmentMethods.ADD)
					.params(developmentParams().id(developmentId).landId('$landId'))
					.build(),
			)
			.category(ActionCategoryId.Develop)
			.order(developCategoryOrder + developmentOrderOffset);
		builder.focus(definition.focus ?? Focus.Economy);
		registry.add(actionId, builder.build());
		developmentOrderOffset += 1;
	}

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
			.order(basicCategoryOrder + 3)
			.focus(Focus.Economy)
			.build(),
	);

	const populationCapacityRequirement = compareRequirement()
		.left(populationEvaluator())
		.operator('lt')
		.right(statEvaluator().key(Stat.maxPopulation))
		.build();

	const populationEntries: {
		actionId: PopulationActionId;
		roleId: PopulationRoleId;
		definition: PopulationDef;
	}[] = (
		Object.entries(POPULATION_ACTION_ID_BY_ROLE) as [
			PopulationRoleId,
			PopulationActionId,
		][]
	).map(([roleId, actionId]) => {
		const definition = POPULATIONS.get(roleId);
		if (!definition) {
			throw new Error(`Missing population definition for id "${roleId}".`);
		}
		return { actionId, roleId, definition };
	});

	let hireOrderOffset = 0;
	for (const { actionId, roleId, definition } of populationEntries) {
		if (!definition.icon) {
			throw new Error(`Missing icon for population definition "${roleId}".`);
		}
		const builder = action()
			.id(actionId)
			.name(`Hire ${definition.name}`)
			.icon(definition.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.requirement(populationCapacityRequirement)
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
			.order(hireCategoryOrder + hireOrderOffset)
			.focus(Focus.Economy);
		registry.add(actionId, builder.build());
		hireOrderOffset += 1;
	}

	const royalDecreeDevelopGroup = actionEffectGroup('royal_decree_develop')
		.layout('compact')
		.option(
			actionEffectGroupOption('royal_decree_house')
				.icon('🏠')
				.action(DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID[DevelopmentId.House])
				.paramLandId('$landId'),
		)
		.option(
			actionEffectGroupOption('royal_decree_farm')
				.icon('🌾')
				.action(DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID[DevelopmentId.Farm])
				.paramLandId('$landId'),
		)
		.option(
			actionEffectGroupOption('royal_decree_outpost')
				.icon('🏹')
				.action(DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID[DevelopmentId.Outpost])
				.paramLandId('$landId'),
		)
		.option(
			actionEffectGroupOption('royal_decree_watchtower')
				.icon('🗼')
				.action(
					DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID[DevelopmentId.Watchtower],
				)
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
			.order(basicCategoryOrder + 5)
			.focus(Focus.Economy)
			.build(),
	);
}
