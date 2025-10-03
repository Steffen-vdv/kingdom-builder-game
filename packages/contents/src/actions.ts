import { Registry } from '@kingdom-builder/engine/registry';
import { Resource } from './resources';
import { Stat, STATS } from './stats';
import { PopulationRole, POPULATION_ROLES } from './populationRoles';
import {
	actionSchema,
	type ActionConfig,
} from '@kingdom-builder/engine/config/schema';
import {
	action,
	effect,
	requirement,
	Types,
	LandMethods,
	ResourceMethods,
	DevelopmentMethods,
	PopulationMethods,
	ActionMethods,
	PassiveMethods,
	CostModMethods,
	ResultModMethods,
	BuildingMethods,
	StatMethods,
	resourceParams,
	statParams,
	developmentParams,
	resultModParams,
	passiveParams,
	costModParams,
	developmentEvaluator,
	populationEvaluator,
	statEvaluator,
	attackParams,
	transferParams,
} from './config/builders';
import type { Focus } from './defs';

export interface ActionDef extends ActionConfig {
	category?: string;
	order?: number;
	focus?: Focus;
}

export function createActionRegistry() {
	const registry = new Registry<ActionDef>(actionSchema.passthrough());

	registry.add('expand', {
		...action()
			.id('expand')
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

	registry.add('overwork', {
		...action()
			.id('overwork')
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
					.effect({
						type: Types.Resource,
						method: ResourceMethods.REMOVE,
						round: 'up',
						params: resourceParams()
							.key(Resource.happiness)
							.amount(0.5)
							.build(),
						meta: { allowShortfall: true },
					})
					.build(),
			)
			.build(),
		category: 'basic',
		order: 2,
		focus: 'economy',
	});

	registry.add('develop', {
		...action()
			.id('develop')
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

	registry.add('tax', {
		...action()
			.id('tax')
			.name('Tax')
			.icon('💰')
			.cost(Resource.ap, 1)
			.effect(
				effect()
					.evaluator(populationEvaluator().param('id', 'tax'))
					.effect(
						effect(Types.Resource, ResourceMethods.ADD)
							.params(resourceParams().key(Resource.gold).amount(4))
							.build(),
					)
					.effect({
						type: Types.Resource,
						method: ResourceMethods.REMOVE,
						round: 'up',
						params: resourceParams()
							.key(Resource.happiness)
							.amount(0.5)
							.build(),
						meta: { allowShortfall: true },
					})
					.build(),
			)
			.build(),
		category: 'basic',
		order: 3,
		focus: 'economy',
	});

	registry.add('reallocate', {
		...action()
			.id('reallocate')
			.name('Reallocate')
			.icon('🔄')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.build(),
		category: 'basic',
		order: 4,
		focus: 'economy',
	});

	registry.add('festival-planning', {
		...action()
			.id('festival-planning')
			.name('Festival Planning')
			.icon('🎭')
			.cost(Resource.ap, 1)
			.effectGroup('festival-perk', (group) =>
				group
					.title('Choose a festival perk')
					.option((option) =>
						option
							.id('crowd-boost')
							.label('Invite travelling performers')
							.description('Placeholder: Gain excitement rewards (demo).')
							.effect(
								effect(Types.Resource, ResourceMethods.ADD)
									.params(resourceParams().key(Resource.happiness).amount(2))
									.build(),
							),
					)
					.option((option) =>
						option
							.id('market-rush')
							.label('Open a vibrant market')
							.description('Placeholder: Generate trade income (demo).')
							.effect(
								effect(Types.Resource, ResourceMethods.ADD)
									.params(resourceParams().key(Resource.gold).amount(3))
									.build(),
							),
					),
			)
			.build(),
		category: 'basic',
		order: 5,
		focus: 'economy',
	});

	registry.add('strategic-council', {
		...action()
			.id('strategic-council')
			.name('Strategic Council')
			.icon('🗺️')
			.cost(Resource.ap, 1)
			.effectGroup('council-agenda', (group) =>
				group
					.title('Set the council agenda')
					.option((option) =>
						option
							.id('fortify')
							.label('Plan fortifications')
							.description('Placeholder: Prepare defenses (demo).')
							.effect(
								effect(Types.Stat, StatMethods.ADD)
									.params(
										statParams().key(Stat.fortificationStrength).amount(1),
									)
									.build(),
							),
					)
					.option((option) =>
						option
							.id('recruit')
							.label('Recruit volunteers')
							.description('Placeholder: Rally supporters (demo).')
							.effect(
								effect(Types.Population, PopulationMethods.ADD)
									.param('role', PopulationRole.Citizen)
									.param('count', 1)
									.build(),
							),
					),
			)
			.effectGroup('council-outcome', (group) =>
				group
					.title('Finalize the strategy')
					.option((option) =>
						option
							.id('treasury')
							.label('Secure treasury support')
							.description('Placeholder: Leverage savings (demo).')
							.effect(
								effect(Types.Resource, ResourceMethods.ADD)
									.params(resourceParams().key(Resource.gold).amount(2))
									.build(),
							),
					)
					.option((option) =>
						option
							.id('morale')
							.label('Boost morale')
							.description('Placeholder: Encourage citizens (demo).')
							.effect(
								effect(Types.Resource, ResourceMethods.ADD)
									.params(resourceParams().key(Resource.happiness).amount(1))
									.build(),
							),
					)
					.option((option) =>
						option
							.id('intel')
							.label('Gather intelligence')
							.description('Placeholder: Scout opportunities (demo).')
							.effect(
								effect(Types.Action, ActionMethods.ADD)
									.params({ id: 'scout-placeholder' })
									.build(),
							),
					),
			)
			.build(),
		category: 'basic',
		order: 6,
		focus: 'other',
	});

	registry.add('raise_pop', {
		...action()
			.id('raise_pop')
			.name('Hire')
			.icon('👶')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 5)
			.requirement(
				requirement('evaluator', 'compare')
					.param('left', populationEvaluator().build())
					.param('operator', 'lt')
					.param('right', statEvaluator().key(Stat.maxPopulation).build())
					.message('Free space for 👥')
					.build(),
			)
			.effect(
				effect(Types.Population, PopulationMethods.ADD)
					.param('role', '$role')
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

	registry.add('royal_decree', {
		...action()
			.id('royal_decree')
			.name('Royal Decree')
			.icon('📜')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 12)
			.build(),
		category: 'basic',
		order: 5,
		focus: 'other',
	});

	registry.add('army_attack', {
		...action()
			.id('army_attack')
			.name('Army Attack')
			.icon('🗡️')
			.cost(Resource.ap, 1)
			.requirement(
				requirement('evaluator', 'compare')
					.param('left', statEvaluator().key(Stat.warWeariness).build())
					.param('operator', 'lt')
					.param(
						'right',
						populationEvaluator().role(PopulationRole.Legion).build(),
					)
					.message(
						`${STATS[Stat.warWeariness].icon} ${STATS[Stat.warWeariness].label} must be lower than ${POPULATION_ROLES[PopulationRole.Legion].icon} ${POPULATION_ROLES[PopulationRole.Legion].label}`,
					)
					.build(),
			)
			.effect(
				effect('attack', 'perform')
					.params(
						attackParams()
							.targetResource(Resource.castleHP)
							.onDamageAttacker(
								effect(Types.Resource, ResourceMethods.ADD)
									.params(resourceParams().key(Resource.happiness).amount(1))
									.build(),
								effect(Types.Action, ActionMethods.PERFORM)
									.param('id', 'plunder')
									.build(),
							)
							.onDamageDefender({
								type: Types.Resource,
								method: ResourceMethods.REMOVE,
								params: resourceParams()
									.key(Resource.happiness)
									.amount(1)
									.build(),
								meta: { allowShortfall: true },
							}),
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

	registry.add('hold_festival', {
		...action()
			.id('hold_festival')
			.name('Hold Festival')
			.icon('🎉')
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(
				requirement('evaluator', 'compare')
					.param('left', statEvaluator().key(Stat.warWeariness).build())
					.param('operator', 'eq')
					.param('right', 0)
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
									.actionId('army_attack'),
							)
							.effect({
								type: Types.Resource,
								method: ResourceMethods.REMOVE,
								params: resourceParams()
									.key(Resource.happiness)
									.amount(3)
									.build(),
								meta: { allowShortfall: true },
							})
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
		'plunder',
		action()
			.id('plunder')
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
		'plow',
		action()
			.id('plow')
			.name('Plow')
			.icon('🚜')
			.system()
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 6)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM)
					.param('id', 'expand')
					.build(),
			)
			.effect(
				effect(Types.Action, ActionMethods.PERFORM).param('id', 'till').build(),
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
		'till',
		action()
			.id('till')
			.name('Till')
			.icon('🧑‍🌾')
			.system()
			.effect(effect(Types.Land, LandMethods.TILL).build())
			.build(),
	);

	registry.add('build', {
		...action()
			.id('build')
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
