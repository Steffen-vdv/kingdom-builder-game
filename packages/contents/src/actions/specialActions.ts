import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resources';
import { Stat } from '../stats';
import { PopulationRole } from '../populationRoles';
import {
	action,
	compareRequirement,
	resourceParams,
	statParams,
	passiveParams,
	actionParams,
	attackParams,
	resultModParams,
	transferParams,
	costModParams,
	buildingParams,
	statEvaluator,
	populationEvaluator,
	effect,
} from '../config/builders';
import {
	ActionMethods,
	AttackMethods,
	PassiveMethods,
	ResourceMethods,
	Types,
	StatMethods,
	CostModMethods,
	ResultModMethods,
	BuildingMethods,
	LandMethods,
} from '../config/builderShared';
import { Focus } from '../defs';
import type { ActionDef } from '../actions';
import { ActionId, BUILDING_ACTION_ID_BY_BUILDING_ID } from '../actions';
import { BUILDINGS } from '../buildings';
import { BUILDING_ID_VALUES } from '../buildingIds';
import type { BuildingIdValue } from '../buildingIds';
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
const buildCategoryOrder = categoryOrder(ActionCategoryId.Build);
const buildingOrderById = new Map(
	BUILDING_ID_VALUES.map((id, index) => [id, index] as const),
);

export function registerSpecialActions(registry: Registry<ActionDef>) {
	registry.add(
		ActionId.army_attack,
		action()
			.id(ActionId.army_attack)
			.name('Army Attack')
			.icon('🗡️')
			.cost(Resource.ap, 1)
			.requirement(
				compareRequirement()
					.left(statEvaluator().key(Stat.warWeariness))
					.operator('lt')
					.right(populationEvaluator().role(PopulationRole.Legion))
					.build(),
			)
			.effect(
				effect(Types.Attack, AttackMethods.PERFORM)
					.params(
						attackParams()
							.powerStat(Stat.armyStrength)
							.absorptionStat(Stat.absorption)
							.fortificationStat(Stat.fortificationStrength)
							.targetResource(Resource.castleHP)
							.onDamageAttacker(
								effect(Types.Action, ActionMethods.PERFORM)
									.params(actionParams().id(ActionId.plunder))
									.build(),
							),
					)
					.build(),
			)
			.effect(
				effect(Types.Stat, StatMethods.ADD)
					.params(statParams().key(Stat.warWeariness).amount(1))
					.build(),
			)
			.category(ActionCategoryId.Basic)
			.order(basicCategoryOrder + 6)
			.focus(Focus.Aggressive)
			.build(),
	);

	registry.add(
		ActionId.hold_festival,
		action()
			.id(ActionId.hold_festival)
			.name('Hold Festival')
			.icon('🎉')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(
				compareRequirement()
					.left(statEvaluator().key(Stat.warWeariness))
					.operator('eq')
					.right(0)
					.build(),
			)
			.effect(
				effect(Types.Resource, ResourceMethods.ADD)
					.params(resourceParams().key(Resource.happiness).amount(3))
					.build(),
			)
			.effect(
				effect(Types.Stat, StatMethods.REMOVE)
					.params(statParams().key(Stat.fortificationStrength).amount(3))
					.build(),
			)
			.effect(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(
						passiveParams()
							.id('hold_festival_penalty')
							.name('Festival Hangover')
							.icon('🤮')
							.removeOnUpkeepStep(),
					)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(
								resultModParams()
									.id('hold_festival_attack_happiness_penalty')
									.actionId(ActionId.army_attack),
							)
							.effect(
								effect(Types.Resource, ResourceMethods.REMOVE)
									.params(resourceParams().key(Resource.happiness).amount(3))
									.allowShortfall()
									.build(),
							)
							.build(),
					)
					.build(),
			)
			.category(ActionCategoryId.Basic)
			.order(basicCategoryOrder + 7)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.plunder,
		action()
			.id(ActionId.plunder)
			.name('Plunder')
			.icon('🏴‍☠️')
			.system()
			.effect(
				effect(Types.Resource, ResourceMethods.TRANSFER)
					.params(transferParams().key(Resource.happiness).amount(1))
					.build(),
			)
			.effect(
				effect(Types.Resource, ResourceMethods.TRANSFER)
					.params(transferParams().key(Resource.gold).percent(25))
					.build(),
			)
			.build(),
	);

	const plowCostPenalty = passiveParams()
		.id('plow_cost_mod')
		.removeOnUpkeepStep();

	registry.add(
		ActionId.plow,
		action()
			.id(ActionId.plow)
			.name('Plow')
			.icon('🚜')
			.system()
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 6)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ActionId.expand))
					.build(),
			)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ActionId.till))
					.build(),
			)
			.effect(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(plowCostPenalty)
					.effect(
						effect(Types.CostMod, CostModMethods.ADD)
							.params(
								costModParams()
									.id('plow_cost_all')
									.key(Resource.gold)
									.amount(2),
							)
							.build(),
					)
					.build(),
			)
			.build(),
	);

	registry.add(
		ActionId.till,
		action()
			.id(ActionId.till)
			.name('Till')
			.icon('🧑‍🌾')
			.system()
			.effect(effect(Types.Land, LandMethods.TILL).build())
			.build(),
	);

	BUILDINGS.entries().forEach(([buildingId, building]) => {
		const typedBuildingId = buildingId as BuildingIdValue;
		const mappedId = BUILDING_ACTION_ID_BY_BUILDING_ID[typedBuildingId];
		const { icon, name, focus } = building;
		if (!name) {
			throw new Error(`Building "${typedBuildingId}" is missing a name.`);
		}
		if (!icon) {
			throw new Error(`Building "${typedBuildingId}" is missing an icon.`);
		}

		registry.add(
			mappedId,
			action()
				.id(mappedId)
				.name(name)
				.icon(icon)
				.effect(
					effect(Types.Building, BuildingMethods.ADD)
						.params(buildingParams().id(typedBuildingId))
						.build(),
				)
				.category(ActionCategoryId.Build)
				.order(
					buildCategoryOrder + (buildingOrderById.get(typedBuildingId) ?? 0),
				)
				.focus(focus ?? Focus.Other)
				.build(),
		);
	});
}
