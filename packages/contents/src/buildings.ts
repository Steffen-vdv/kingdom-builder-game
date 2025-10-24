import { Registry, TRANSFER_PCT_EVALUATION_ID, TRANSFER_PCT_EVALUATION_TYPE, buildingSchema } from '@kingdom-builder/protocol';
import { ActionId, PopulationEvaluationId } from './actionIds';
import { Resource } from './resources';
import { Stat } from './stats';
import { DevelopmentId } from './developments';
import { building, effect, resourceParams, actionParams, resultModParams, evaluationTarget, developmentTarget, populationTarget, costModParams, statParams, resourceV2Add } from './config/builders';
import { Types, CostModMethods, ResultModMethods, ResourceMethods, ActionMethods, PassiveMethods, StatMethods } from './config/builderShared';
import { Focus } from './defs';
import { BuildingId as BuildingIdMap } from './buildingIds';
import type { BuildingId as BuildingIdType } from './buildingIds';
import type { BuildingDef } from './defs';
import { ResourceV2Id } from './resourceV2';
export const BuildingId = BuildingIdMap;
export type BuildingId = BuildingIdType;
export function createBuildingRegistry() {
	const schema = buildingSchema.passthrough();
	const registry = new Registry<BuildingDef>(schema);
	registry.add(
		BuildingId.TownCharter,
		building()
			.id(BuildingId.TownCharter)
			.name('Town Charter')
			.icon('🏘️')
			.cost(Resource.gold, 5)
			.onBuild(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('tc_expand_cost').actionId(ActionId.expand).key(Resource.gold).amount(2)).build())
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(resultModParams().id('tc_expand_result').actionId(ActionId.expand))
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceParams().key(Resource.happiness).amount(1)).build())
					.build(),
			)
			.focus(Focus.Economy)
			.build(),
	);
	const millFarmResultParams = resultModParams().id('mill_farm_bonus').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(1);

	registry.add(
		BuildingId.Mill,
		building()
			.id(BuildingId.Mill)
			.name('Mill')
			.icon('⚙️')
			.cost(Resource.gold, 7)
			.onBuild(effect(Types.ResultMod, ResultModMethods.ADD).params(millFarmResultParams).build())
			.focus(Focus.Economy)
			.build(),
	);
	registry.add(
		BuildingId.RaidersGuild,
		building()
			.id(BuildingId.RaidersGuild)
			.name("Raider's Guild")
			.icon('🏴‍☠️')
			.cost(Resource.gold, 8)
			.cost(Resource.ap, 1)
			.upkeep(Resource.gold, 1)
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(resultModParams().id('raiders_guild_plunder_bonus').evaluation(evaluationTarget(TRANSFER_PCT_EVALUATION_TYPE).id(TRANSFER_PCT_EVALUATION_ID)).adjust(25))
					.build(),
			)
			.focus(Focus.Aggressive)
			.build(),
	);
	registry.add(
		BuildingId.PlowWorkshop,
		building()
			.id(BuildingId.PlowWorkshop)
			.name('Plow Workshop')
			.icon('🏭')
			.cost(Resource.gold, 10)
			.onBuild(effect(Types.Action, ActionMethods.ADD).params(actionParams().id(ActionId.plow)).build())
			.focus(Focus.Economy)
			.build(),
	);
	registry.add(
		BuildingId.Market,
		building()
			.id(BuildingId.Market)
			.name('Market')
			.icon('🏪')
			.cost(Resource.gold, 10)
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(resultModParams().id('market_tax_bonus').evaluation(populationTarget().id(PopulationEvaluationId.tax)).amount(1))
					.build(),
			)
			.focus(Focus.Economy)
			.build(),
	);
	registry.add(
		BuildingId.CastleWalls,
		building()
			.id(BuildingId.CastleWalls)
			.name('Castle Walls')
			.icon('🧱')
			.cost(Resource.gold, 12)
			.onBuild(
				effect(Types.Passive, PassiveMethods.ADD)
					.param('id', 'castle_walls_bonus')
					.effect(effect(Types.Stat, StatMethods.ADD).params(statParams().key(Stat.fortificationStrength).amount(5)).build())
					.effect(resourceV2Add(ResourceV2Id.Absorption).amount(0.2).build())
					.build(),
			)
			.focus(Focus.Defense)
			.build(),
	);
	const simpleBuildings: Array<[BuildingId, string, string, number, Focus]> = [
		[BuildingId.Barracks, 'Barracks', '🪖', 12, Focus.Aggressive],
		[BuildingId.Citadel, 'Citadel', '🏯', 12, Focus.Defense],
		[BuildingId.CastleGardens, 'Castle Gardens', '🌷', 15, Focus.Economy],
		[BuildingId.Temple, 'Temple', '⛪', 16, Focus.Other],
		[BuildingId.Palace, 'Palace', '👑', 20, Focus.Other],
		[BuildingId.GreatHall, 'Great Hall', '🏟️', 22, Focus.Other],
	];
	simpleBuildings.forEach(([id, name, icon, cost, focus]) => {
		registry.add(id, building().id(id).name(name).icon(icon).cost(Resource.gold, cost).focus(focus).build());
	});
	return registry;
}
export const BUILDINGS = createBuildingRegistry();
