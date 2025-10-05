import { Registry } from '@kingdom-builder/protocol';
import { Resource } from './resources';
import { Stat, STATS } from './stats';
import { PopulationRole, POPULATION_ROLES } from './populationRoles';
import { actionSchema, type ActionConfig } from '@kingdom-builder/protocol';
import {
	action,
	effect,
	compareRequirement,
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
	resourceParams,
	statParams,
	developmentParams,
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
import type { Focus } from './defs';

export const ACTION_ID = {
	build: 'build',
	armyAttack: 'army_attack',
	develop: 'develop',
	expand: 'expand',
	holdFestival: 'hold_festival',
	overwork: 'overwork',
	plow: 'plow',
	plunder: 'plunder',
	raisePop: 'raise_pop',
	reallocate: 'reallocate',
	royalDecree: 'royal_decree',
	tax: 'tax',
	till: 'till',
} as const;

export type ActionId = (typeof ACTION_ID)[keyof typeof ACTION_ID];

export interface ActionDef extends ActionConfig {
	category?: string;
	order?: number;
	focus?: Focus;
}

export function createActionRegistry() {
	const registry = new Registry<ActionDef>(actionSchema.passthrough());

	registry.add(ACTION_ID.expand, {
		...action()
			.id(ACTION_ID.expand)
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
			.build(),
		category: 'basic',
		order: 1,
		focus: 'economy',
	});

	registry.add(ACTION_ID.overwork, {
		...action()
			.id(ACTION_ID.overwork)
			.name('Overwork')
			.icon('🛠️')
			.cost(Resource.ap, 1)
			.effect(
				effect()
					.evaluator(developmentEvaluator().id('farm'))
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
			.build(),
		category: 'basic',
		order: 2,
		focus: 'economy',
	});

	registry.add(ACTION_ID.develop, {
		...action()
			.id(ACTION_ID.develop)
			.name('Develop')
			.icon('🏗️')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.effect(
				effect(Types.Development, DevelopmentMethods.ADD)
					.params(developmentParams().id('$id').landId('$landId'))
					.build(),
			)
			.build(),
		category: 'development',
		order: 1,
		focus: 'economy',
	});

	registry.add(ACTION_ID.tax, {
		...action()
			.id(ACTION_ID.tax)
			.name('Tax')
			.icon('💰')
			.cost(Resource.ap, 1)
			.effect(
				effect()
					.evaluator(populationEvaluator().id('tax'))
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
			.build(),
		category: 'basic',
		order: 3,
		focus: 'economy',
	});

	registry.add(ACTION_ID.reallocate, {
		...action()
			.id(ACTION_ID.reallocate)
			.name('Reallocate')
			.icon('🔄')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.build(),
		category: 'basic',
		order: 4,
		focus: 'economy',
	});

	registry.add(ACTION_ID.raisePop, {
		...action()
			.id(ACTION_ID.raisePop)
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
			.build(),
		category: 'population',
		order: 1,
		focus: 'economy',
	});

	registry.add(ACTION_ID.royalDecree, {
		...action()
			.id(ACTION_ID.royalDecree)
			.name('Royal Decree')
			.icon('📜')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 12)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ACTION_ID.expand))
					.build(),
			)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ACTION_ID.till).landId('$landId'))
					.build(),
			)
			.effectGroup(
				actionEffectGroup('royal_decree_develop')
					.layout('compact')
					.option(
						actionEffectGroupOption('royal_decree_house')
							.label('Raise a House')
							.icon('🏠')
							.action(ACTION_ID.develop)
							.params(actionParams().id('house').landId('$landId')),
					)
					.option(
						actionEffectGroupOption('royal_decree_farm')
							.label('Establish a Farm')
							.icon('🌾')
							.action(ACTION_ID.develop)
							.params(actionParams().id('farm').landId('$landId')),
					)
					.option(
						actionEffectGroupOption('royal_decree_outpost')
							.label('Fortify with an Outpost')
							.icon('🏹')
							.action(ACTION_ID.develop)
							.params(actionParams().id('outpost').landId('$landId')),
					)
					.option(
						actionEffectGroupOption('royal_decree_watchtower')
							.label('Raise a Watchtower')
							.icon('🗼')
							.action(ACTION_ID.develop)
							.params(actionParams().id('watchtower').landId('$landId')),
					),
			)
			.effect(
				effect(Types.Resource, ResourceMethods.REMOVE)
					.params(resourceParams().key(Resource.happiness).amount(3))
					.allowShortfall()
					.build(),
			)
			.build(),
		category: 'basic',
		order: 5,
		focus: 'economy',
	});

	registry.add(ACTION_ID.armyAttack, {
		...action()
			.id(ACTION_ID.armyAttack)
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
									.params(actionParams().id(ACTION_ID.plunder))
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
			.build(),
		category: 'basic',
		order: 6,
		focus: 'aggressive',
	});

	registry.add(ACTION_ID.holdFestival, {
		...action()
			.id(ACTION_ID.holdFestival)
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
									.actionId(ACTION_ID.armyAttack),
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
			.build(),
		category: 'basic',
		order: 7,
		focus: 'economy',
	});

	registry.add(
		ACTION_ID.plunder,
		action()
			.id(ACTION_ID.plunder)
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
		ACTION_ID.plow,
		action()
			.id(ACTION_ID.plow)
			.name('Plow')
			.icon('🚜')
			.system()
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 6)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ACTION_ID.expand))
					.build(),
			)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.params(actionParams().id(ACTION_ID.till))
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
		ACTION_ID.till,
		action()
			.id(ACTION_ID.till)
			.name('Till')
			.icon('🧑‍🌾')
			.system()
			.effect(effect(Types.Land, LandMethods.TILL).build())
			.build(),
	);

	registry.add(ACTION_ID.build, {
		...action()
			.id(ACTION_ID.build)
			.name('Build')
			.icon('🏛️')
			.effect(
				effect(Types.Building, BuildingMethods.ADD).param('id', '$id').build(),
			)
			.build(),
		category: 'building',
		order: 1,
		focus: 'other',
	});

	return registry;
}

export const ACTIONS = createActionRegistry();
