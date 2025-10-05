import {
	Registry,
	TRANSFER_PCT_EVALUATION_ID,
	TRANSFER_PCT_EVALUATION_TYPE,
	buildingSchema,
} from '@kingdom-builder/protocol';
import { Resource } from './resources';
import { ACTION_ID } from './actions';
import { Stat } from './stats';
import {
	building,
	effect,
	Types,
	CostModMethods,
	ResultModMethods,
	ResourceMethods,
	ActionMethods,
	PassiveMethods,
	StatMethods,
	resourceParams,
	actionParams,
	resultModParams,
	evaluationTarget,
	developmentTarget,
	populationTarget,
	costModParams,
	statParams,
} from './config/builders';
import type { BuildingDef } from './defs';

export type { BuildingDef } from './defs';

export function createBuildingRegistry() {
	const registry = new Registry<BuildingDef>(buildingSchema.passthrough());

	registry.add('town_charter', {
		...building()
			.id('town_charter')
			.name('Town Charter')
			.icon('🏘️')
			.cost(Resource.gold, 5)
			.onBuild(
				effect(Types.CostMod, CostModMethods.ADD)
					.params(
						costModParams()
							.id('tc_expand_cost')
							.actionId(ACTION_ID.expand)
							.key(Resource.gold)
							.amount(2),
					)
					.build(),
			)
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(
						resultModParams().id('tc_expand_result').actionId(ACTION_ID.expand),
					)
					.effect(
						effect(Types.Resource, ResourceMethods.ADD)
							.params(resourceParams().key(Resource.happiness).amount(1))
							.build(),
					)
					.build(),
			)
			.build(),
		focus: 'economy',
	});

	// TODO: remaining buildings from original manual config
	registry.add('mill', {
		...building()
			.id('mill')
			.name('Mill')
			.icon('⚙️')
			.cost(Resource.gold, 7)
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(
						resultModParams()
							.id('mill_farm_bonus')
							.evaluation(developmentTarget().id('farm'))
							.amount(1),
					)
					.build(),
			)
			.build(),
		focus: 'economy',
	});
	registry.add('raiders_guild', {
		...building()
			.id('raiders_guild')
			.name("Raider's Guild")
			.icon('🏴‍☠️')
			.cost(Resource.gold, 8)
			.cost(Resource.ap, 1)
			.upkeep(Resource.gold, 1)
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(
						resultModParams()
							.id('raiders_guild_plunder_bonus')
							.evaluation(
								evaluationTarget(TRANSFER_PCT_EVALUATION_TYPE).id(
									TRANSFER_PCT_EVALUATION_ID,
								),
							)
							.adjust(25),
					)
					.build(),
			)
			.build(),
		focus: 'aggressive',
	});
	registry.add('plow_workshop', {
		...building()
			.id('plow_workshop')
			.name('Plow Workshop')
			.icon('🏭')
			.cost(Resource.gold, 10)
			.onBuild(
				effect(Types.Action, ActionMethods.ADD)
					.params(actionParams().id(ACTION_ID.plow))
					.build(),
			)
			.build(),
		focus: 'economy',
	});
	registry.add('market', {
		...building()
			.id('market')
			.name('Market')
			.icon('🏪')
			.cost(Resource.gold, 10)
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(
						resultModParams()
							.id('market_tax_bonus')
							.evaluation(populationTarget().id('tax'))
							.amount(1),
					)
					.build(),
			)
			.build(),
		focus: 'economy',
	});
	registry.add('barracks', {
		...building()
			.id('barracks')
			.name('Barracks')
			.icon('🪖')
			.cost(Resource.gold, 12)
			.build(),
		focus: 'aggressive',
	});
	registry.add('citadel', {
		...building()
			.id('citadel')
			.name('Citadel')
			.icon('🏯')
			.cost(Resource.gold, 12)
			.build(),
		focus: 'defense',
	});
	registry.add('castle_walls', {
		...building()
			.id('castle_walls')
			.name('Castle Walls')
			.icon('🧱')
			.cost(Resource.gold, 12)
			.onBuild(
				effect(Types.Passive, PassiveMethods.ADD)
					.param('id', 'castle_walls_bonus')
					.effect(
						effect(Types.Stat, StatMethods.ADD)
							.params(statParams().key(Stat.fortificationStrength).amount(5))
							.build(),
					)
					.effect(
						effect(Types.Stat, StatMethods.ADD)
							.params(statParams().key(Stat.absorption).amount(0.2))
							.build(),
					)
					.build(),
			)
			.build(),
		focus: 'defense',
	});
	registry.add('castle_gardens', {
		...building()
			.id('castle_gardens')
			.name('Castle Gardens')
			.icon('🌷')
			.cost(Resource.gold, 15)
			.build(),
		focus: 'economy',
	});
	registry.add('temple', {
		...building()
			.id('temple')
			.name('Temple')
			.icon('⛪')
			.cost(Resource.gold, 16)
			.build(),
		focus: 'other',
	});
	registry.add('palace', {
		...building()
			.id('palace')
			.name('Palace')
			.icon('👑')
			.cost(Resource.gold, 20)
			.build(),
		focus: 'other',
	});
	registry.add('great_hall', {
		...building()
			.id('great_hall')
			.name('Great Hall')
			.icon('🏟️')
			.cost(Resource.gold, 22)
			.build(),
		focus: 'other',
	});

	return registry;
}

export const BUILDINGS = createBuildingRegistry();
