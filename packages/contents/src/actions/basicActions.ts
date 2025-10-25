import type { Registry } from '@kingdom-builder/protocol';
import { Resource } from '../resources';
import { Stat } from '../stats';
import { DevelopmentId } from '../developments';
import { PopulationRole } from '../populationRoles';
import type { ActionDef } from '../actions';
import {
	action,
	compareRequirement,
	effect,
	populationEvaluator,
	statEvaluator,
	actionParams,
	actionEffectGroup,
	actionEffectGroupOption,
	actionEffectGroupOptionParams,
	attackParams,
	passiveParams,
	resultModParams,
	costModParams,
} from '../config/builders';
import { ActionMethods, AttackMethods, PassiveMethods, ResourceMethods, Types, StatMethods, CostModMethods, LandMethods, ResultModMethods } from '../config/builderShared';
import { Focus } from '../defs';
import { ActionId, DevelopActionId, PopulationEvaluationId } from '../actionIds';
import { ActionCategoryId as ActionCategory, ACTION_CATEGORIES } from '../actionCategories';
import { resourceAmountChange, resourceTransferAmount, resourceTransferPercent, statAmountChange } from '../helpers/resourceV2Effects';

const categoryOrder = (categoryId: keyof typeof ActionCategory) => {
	const category = ACTION_CATEGORIES.get(ActionCategory[categoryId]);
	if (!category) {
		throw new Error(`Missing action category definition for id "${ActionCategory[categoryId]}".`);
	}
	return category.order ?? 0;
};

const basicCategoryOrder = categoryOrder('Basic');

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
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build())
			.category(ActionCategory.Basic)
			.order(basicCategoryOrder + 1)
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
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.gold, 4)).build())
					.effect(
						effect(Types.Resource, ResourceMethods.REMOVE)
							.params(resourceAmountChange(Resource.happiness, 0.5, (change) => change.reconciliation()))
							.build(),
					)
					.build(),
			)
			.category(ActionCategory.Basic)
			.order(basicCategoryOrder + 3)
			.focus(Focus.Economy)
			.build(),
	);

	const royalDecreeDevelopGroup = actionEffectGroup('royal_decree_develop')
		.layout('compact')
		.option(
			actionEffectGroupOption('royal_decree_house')
				.icon('🏠')
				.action(DevelopActionId.develop_house)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionId.develop_house).developmentId(DevelopmentId.House).landId('$landId')),
		)
		.option(
			actionEffectGroupOption('royal_decree_farm')
				.icon('🌾')
				.action(DevelopActionId.develop_farm)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionId.develop_farm).developmentId(DevelopmentId.Farm).landId('$landId')),
		)
		.option(
			actionEffectGroupOption('royal_decree_outpost')
				.icon('🏹')
				.action(DevelopActionId.develop_outpost)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionId.develop_outpost).developmentId(DevelopmentId.Outpost).landId('$landId')),
		)
		.option(
			actionEffectGroupOption('royal_decree_watchtower')
				.icon('🗼')
				.action(DevelopActionId.develop_watchtower)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionId.develop_watchtower).developmentId(DevelopmentId.Watchtower).landId('$landId')),
		);

	registry.add(
		ActionId.royal_decree,
		action()
			.id(ActionId.royal_decree)
			.name('Royal Decree')
			.icon('📜')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 12)
			.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(ActionId.expand)).build())
			.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(ActionId.till).landId('$landId')).build())
			.effectGroup(royalDecreeDevelopGroup)
			.effect(
				effect(Types.Resource, ResourceMethods.REMOVE)
					.params(resourceAmountChange(Resource.happiness, 3, (change) => change.reconciliation()))
					.build(),
			)
			.category(ActionCategory.Basic)
			.order(basicCategoryOrder + 5)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.army_attack,
		action()
			.id(ActionId.army_attack)
			.name('Army Attack')
			.icon('🗡️')
			.cost(Resource.ap, 1)
			.requirement(compareRequirement().left(statEvaluator().key(Stat.warWeariness)).operator('lt').right(populationEvaluator().role(PopulationRole.Legion)).build())
			.effect(
				effect(Types.Attack, AttackMethods.PERFORM)
					.params(
						attackParams()
							.powerStat(Stat.armyStrength)
							.absorptionStat(Stat.absorption)
							.fortificationStat(Stat.fortificationStrength)
							.targetResource(Resource.castleHP)
							.onDamageAttacker(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(ActionId.plunder)).build()),
					)
					.build(),
			)
			.effect(effect(Types.Stat, StatMethods.ADD).params(statAmountChange(Stat.warWeariness, 1)).build())
			.category(ActionCategory.Basic)
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
			.requirement(compareRequirement().left(statEvaluator().key(Stat.warWeariness)).operator('eq').right(0).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 3)).build())
			.effect(
				effect(Types.Stat, StatMethods.REMOVE)
					.params(statAmountChange(Stat.fortificationStrength, 3, (change) => change.reconciliation()))
					.build(),
			)
			.effect(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(passiveParams().id('hold_festival_penalty').name('Festival Hangover').icon('🤮').removeOnUpkeepStep())
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('hold_festival_attack_happiness_penalty').actionId(ActionId.army_attack))
							.effect(
								effect(Types.Resource, ResourceMethods.REMOVE)
									.params(resourceAmountChange(Resource.happiness, 3, (change) => change.reconciliation()))
									.build(),
							)
							.build(),
					)
					.build(),
			)
			.category(ActionCategory.Basic)
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
			.effect(effect(Types.Resource, ResourceMethods.TRANSFER).params(resourceTransferAmount(Resource.happiness, 1)).build())
			.effect(effect(Types.Resource, ResourceMethods.TRANSFER).params(resourceTransferPercent(Resource.gold, 25)).build())
			.category(ActionCategory.Basic)
			.focus(Focus.Aggressive)
			.build(),
	);

	const plowCostPenalty = passiveParams().id('plow_cost_mod').removeOnUpkeepStep();

	registry.add(
		ActionId.plow,
		action()
			.id(ActionId.plow)
			.name('Plow')
			.icon('🚜')
			.system()
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 6)
			.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(ActionId.expand)).build())
			.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(ActionId.till)).build())
			.effect(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(plowCostPenalty)
					.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('plow_cost_all').key(Resource.gold).amount(2)).build())
					.build(),
			)
			.category(ActionCategory.Basic)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.till,
		action().id(ActionId.till).name('Till').icon('🧑‍🌾').system().effect(effect(Types.Land, LandMethods.TILL).build()).category(ActionCategory.Basic).focus(Focus.Economy).build(),
	);
}
