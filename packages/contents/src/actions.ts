import { Registry } from '@kingdom-builder/protocol';
import { Resource } from './resources';
import { Stat, STATS } from './stats';
import { PopulationRole, POPULATION_ROLES } from './populationRoles';
import { DevelopmentId } from './developments';
import { actionSchema, type ActionConfig } from '@kingdom-builder/protocol';
import {
	action,
	effect,
	compareRequirement,
	resourceParams,
	statParams,
	developmentParams,
	buildingParams,
	actionParams,
	resultModParams,
	passiveParams,
	costModParams,
	developmentEvaluator,
	populationParams,
	populationEvaluator,
	statEvaluator,
	attackParams,
	transferParams,
	actionEffectGroup,
	actionEffectGroupOption,
} from './config/builders';
import {
	Types,
	LandMethods,
	ResourceMethods,
	DevelopmentMethods,
	PopulationMethods,
	ActionMethods,
	AttackMethods,
	PassiveMethods,
	CostModMethods,
	ResultModMethods,
	BuildingMethods,
	StatMethods,
} from './config/builderShared';
import { Focus } from './defs';
import type { Focus as FocusType } from './defs';

const ACTION_ID_MAP = {
	build: 'build',
	army_attack: 'army_attack',
	develop: 'develop',
	expand: 'expand',
	hold_festival: 'hold_festival',
	overwork: 'overwork',
	plow: 'plow',
	plunder: 'plunder',
	raise_pop: 'raise_pop',
	reallocate: 'reallocate',
	royal_decree: 'royal_decree',
	tax: 'tax',
	till: 'till',
} as const;

const POPULATION_EVALUATION_ID_MAP = {
	tax: 'tax',
} as const;

export const ActionId = ACTION_ID_MAP;

export type ActionId = (typeof ACTION_ID_MAP)[keyof typeof ACTION_ID_MAP];

export const PopulationEvaluationId = POPULATION_EVALUATION_ID_MAP;

type PopulationEvaluationIdMap = typeof POPULATION_EVALUATION_ID_MAP;

export type PopulationEvaluationId =
	PopulationEvaluationIdMap[keyof PopulationEvaluationIdMap];

export const ActionCategory = {
	Basic: 'basic',
	Development: 'development',
	Population: 'population',
	Building: 'building',
} as const;

export type ActionCategory =
	(typeof ActionCategory)[keyof typeof ActionCategory];

export interface ActionDef extends ActionConfig {
	category?: ActionCategory;
	order?: number;
	focus?: FocusType;
}

export function createActionRegistry() {
	const registry = new Registry<ActionDef>(actionSchema.passthrough());

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
			.category(ActionCategory.Basic)
			.order(1)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.overwork,
		action()
			.id(ActionId.overwork)
			.name('Overwork')
			.icon('🛠️')
			.cost(Resource.ap, 1)
			.effect(
				effect()
					.evaluator(developmentEvaluator().id(DevelopmentId.Farm))
					.effect(
						effect(Types.Resource, ResourceMethods.ADD)
							.round('down')
							.params(resourceParams().key(Resource.gold).amount(2))
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
			.category(ActionCategory.Basic)
			.order(2)
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
			.category(ActionCategory.Development)
			.order(1)
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
			.category(ActionCategory.Basic)
			.order(3)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.reallocate,
		action()
			.id(ActionId.reallocate)
			.name('Reallocate')
			.icon('🔄')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.category(ActionCategory.Basic)
			.order(4)
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
					.message('Free space for 👥')
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
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ActionId.reallocate))
					.build(),
			)
			.category(ActionCategory.Population)
			.order(1)
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
				.label('Establish a Farm')
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
			.category(ActionCategory.Basic)
			.order(5)
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
			.requirement(
				compareRequirement()
					.left(statEvaluator().key(Stat.warWeariness))
					.operator('lt')
					.right(populationEvaluator().role(PopulationRole.Legion))
					.message(
						`${STATS[Stat.warWeariness].icon} ${STATS[Stat.warWeariness].label} must be lower than ${POPULATION_ROLES[PopulationRole.Legion].icon} ${POPULATION_ROLES[PopulationRole.Legion].label}`,
					)
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
								effect(Types.Resource, ResourceMethods.ADD)
									.params(resourceParams().key(Resource.happiness).amount(1))
									.build(),
								effect(Types.Action, ActionMethods.PERFORM)
									.params(actionParams().id(ActionId.plunder))
									.build(),
							)
							.onDamageDefender(
								effect(Types.Resource, ResourceMethods.REMOVE)
									.params(resourceParams().key(Resource.happiness).amount(1))
									.allowShortfall()
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
			.category(ActionCategory.Basic)
			.order(6)
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
					.message(
						`${STATS[Stat.warWeariness].icon} ${STATS[Stat.warWeariness].label} must be 0`,
					)
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
							.icon('🥴')
							.onUpkeepPhase(
								effect(Types.Passive, PassiveMethods.REMOVE)
									.param('id', 'hold_festival_penalty')
									.build(),
							),
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
			.category(ActionCategory.Basic)
			.order(7)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ActionId.plunder,
		action()
			.id(ActionId.plunder)
			.name('Plunder')
			.icon('🏴\u200d☠️')
			.system()
			// Base 25% transfer; modifiers may adjust via result_mod targeting
			// evaluation { type: 'transfer_pct', id: 'percent' } with an `adjust` value.
			.effect(
				effect(Types.Resource, ResourceMethods.TRANSFER)
					.params(transferParams().key(Resource.gold).percent(25))
					.build(),
			)
			.build(),
	);

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
					.params(
						passiveParams()
							.id('plow_cost_mod')
							.onUpkeepPhase(
								effect(Types.Passive, PassiveMethods.REMOVE)
									.param('id', 'plow_cost_mod')
									.build(),
							),
					)
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

	registry.add(
		ActionId.build,
		action()
			.id(ActionId.build)
			.name('Build')
			.icon('🏛️')
			.effect(
				effect(Types.Building, BuildingMethods.ADD)
					.params(buildingParams().id('$id'))
					.build(),
			)
			.category(ActionCategory.Building)
			.order(1)
			.focus(Focus.Other)
			.build(),
	);

	return registry;
}

export const ACTIONS = createActionRegistry();
