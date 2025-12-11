/**
 * Building Definitions
 *
 * This file defines all game buildings using pure builder patterns.
 * Each building is self-contained with inline values for clarity.
 *
 * For non-technical content maintainers:
 * - Each building() call creates a new building definition
 * - Chain methods like .id(), .name(), .icon(), .cost() to set properties
 * - Use .onBuild() to add effects that trigger when the building is constructed
 * - Always end with .build() to finalize the building
 */
import { Registry, TRANSFER_PCT_EVALUATION_ID, TRANSFER_PCT_EVALUATION_TYPE, buildingSchema } from '@kingdom-builder/protocol';
import { ActionId, PopulationEvaluationId } from './actionIds';
import { Resource } from './internal';
import { DevelopmentId } from './developments';
import { building, effect, actionParams, resultModParams, evaluationTarget, developmentTarget, populationTarget, costModParams, passiveParams } from './infrastructure/builders';
import { Types, CostModMethods, ResultModMethods, ResourceMethods, ActionMethods, PassiveMethods } from './infrastructure/builderShared';
import { Focus } from './infrastructure/defs';
import { BuildingId as BuildingIdMap } from './buildingIds';
import type { BuildingId as BuildingIdType } from './buildingIds';
import type { BuildingDef } from './infrastructure/defs';
import { resourceChange } from './resource';

export const BuildingId = BuildingIdMap;
export type BuildingId = BuildingIdType;

export function createBuildingRegistry() {
	const registry = new Registry<BuildingDef>(buildingSchema.passthrough());

	// ═══════════════════════════════════════════════════════════════════════════
	// ECONOMY BUILDINGS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		BuildingId.TownCharter,
		building()
			.id(BuildingId.TownCharter)
			.name('Town Charter')
			.icon('🏘️')
			.cost(Resource.gold, 5)
			.onBuild(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('tc_expand_cost').actionId(ActionId.expand).resourceId(Resource.gold).amount(2)).build())
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(resultModParams().id('tc_expand_result').actionId(ActionId.expand))
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.happiness).amount(1).build()).build())
					.build(),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildingId.Mill,
		building()
			.id(BuildingId.Mill)
			.name('Mill')
			.icon('⚙️')
			.cost(Resource.gold, 7)
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(resultModParams().id('mill_farm_bonus').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(1))
					.build(),
			)
			.focus(Focus.Economy)
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

	registry.add(BuildingId.CastleGardens, building().id(BuildingId.CastleGardens).name('Castle Gardens').icon('🌷').cost(Resource.gold, 15).focus(Focus.Economy).build());

	// ═══════════════════════════════════════════════════════════════════════════
	// AGGRESSIVE BUILDINGS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		BuildingId.RaidersGuild,
		building()
			.id(BuildingId.RaidersGuild)
			.name("Raider's Guild")
			.icon('🏴‍☠️')
			.cost(Resource.gold, 8)
			.upkeep(Resource.gold, 1)
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(resultModParams().id('raiders_guild_plunder_bonus').evaluation(evaluationTarget(TRANSFER_PCT_EVALUATION_TYPE).id(TRANSFER_PCT_EVALUATION_ID)).adjust(25))
					.build(),
			)
			.focus(Focus.Aggressive)
			.build(),
	);

	registry.add(BuildingId.Barracks, building().id(BuildingId.Barracks).name('Barracks').icon('🪖').cost(Resource.gold, 12).focus(Focus.Aggressive).build());

	// ═══════════════════════════════════════════════════════════════════════════
	// DEFENSE BUILDINGS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		BuildingId.CastleWalls,
		building()
			.id(BuildingId.CastleWalls)
			.name('Castle Walls')
			.icon('🧱')
			.cost(Resource.gold, 12)
			.onBuild(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(passiveParams().id('castle_walls_bonus'))
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.fortificationStrength).amount(5).build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.absorption).amount(0.2).build()).build())
					.build(),
			)
			.focus(Focus.Defense)
			.build(),
	);

	registry.add(BuildingId.Citadel, building().id(BuildingId.Citadel).name('Citadel').icon('🏯').cost(Resource.gold, 12).focus(Focus.Defense).build());

	// ═══════════════════════════════════════════════════════════════════════════
	// OTHER BUILDINGS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(BuildingId.Temple, building().id(BuildingId.Temple).name('Temple').icon('⛪').cost(Resource.gold, 16).focus(Focus.Other).build());

	registry.add(BuildingId.Palace, building().id(BuildingId.Palace).name('Palace').icon('👑').cost(Resource.gold, 20).focus(Focus.Other).build());

	registry.add(BuildingId.GreatHall, building().id(BuildingId.GreatHall).name('Great Hall').icon('🏟️').cost(Resource.gold, 22).focus(Focus.Other).build());

	return registry;
}

export const BUILDINGS = createBuildingRegistry();
