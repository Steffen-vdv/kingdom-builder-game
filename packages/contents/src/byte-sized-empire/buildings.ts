import { Registry, buildingSchema } from '@boardsmith/protocol';
import { Types, ResourceMethods, ActionMethods, CostModMethods, ResultModMethods, resourceAmountChange } from '@boardsmith/contents-sdk';
import { building, effect, actionParams, resultModParams, costModParams, developmentTarget } from '../infrastructure/builders';
import type { BuildingDef } from '../infrastructure/defs';
import { Res, Building, Dev, Act } from './ids';

export function createBuildingRegistry() {
	const registry = new Registry<BuildingDef>(buildingSchema.passthrough());

	// Farm Complex: +2 Food/turn, Farm devs produce +1 Food each
	registry.add(
		Building.farmComplex,
		building()
			.id(Building.farmComplex)
			.name('Farm Complex')
			.icon('🏗️')
			.cost(Res.materials, 3)
			.cost(Res.gold, 1)
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.food, 2)).build())
			.onBuild(
				effect(Types.ResultMod, ResultModMethods.ADD)
					.params(resultModParams().id('farm_complex_farm_bonus').evaluation(developmentTarget().id(Dev.farm)).amount(1))
					.build(),
			)
			.build(),
	);

	// Granary: food surplus handling (phase-driven)
	registry.add(Building.granary, building().id(Building.granary).name('Granary').icon('🏛️').cost(Res.materials, 2).cost(Res.gold, 2).build());

	// Workshop: +2 Materials/turn, building costs -1 Material
	registry.add(
		Building.workshop,
		building()
			.id(Building.workshop)
			.name('Workshop')
			.icon('🔨')
			.cost(Res.materials, 3)
			.cost(Res.gold, 2)
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.materials, 2)).build())
			.onBuild(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('workshop_mat_discount').resourceId(Res.materials).amount(-1)).build())
			.build(),
	);

	// Market: +2 Gold/turn, unlocks Trade action
	registry.add(
		Building.market,
		building()
			.id(Building.market)
			.name('Market')
			.icon('🏪')
			.cost(Res.materials, 2)
			.cost(Res.gold, 4)
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.gold, 2)).build())
			.onBuild(effect(Types.Action, ActionMethods.ADD).params(actionParams().id(Act.trade)).build())
			.build(),
	);

	// Library: +2 Knowledge/turn
	registry.add(
		Building.library,
		building()
			.id(Building.library)
			.name('Library')
			.icon('📖')
			.cost(Res.materials, 3)
			.cost(Res.gold, 3)
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.knowledge, 2)).build())
			.build(),
	);

	// Academy: research costs -2 Knowledge
	registry.add(
		Building.academy,
		building()
			.id(Building.academy)
			.name('Academy')
			.icon('🎓')
			.cost(Res.materials, 4)
			.cost(Res.gold, 5)
			.onBuild(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('academy_research_discount').resourceId(Res.knowledge).amount(-2)).build())
			.build(),
	);

	// Temple: +2 Influence/turn, +1 Happiness
	registry.add(
		Building.temple,
		building()
			.id(Building.temple)
			.name('Temple')
			.icon('⛪')
			.cost(Res.materials, 4)
			.cost(Res.gold, 3)
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.influence, 2)).build())
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.happiness, 1)).build())
			.build(),
	);

	// Tavern: +1 Happiness, unlocks Festival action
	registry.add(
		Building.tavern,
		building()
			.id(Building.tavern)
			.name('Tavern')
			.icon('🍺')
			.cost(Res.materials, 2)
			.cost(Res.gold, 3)
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.happiness, 1)).build())
			.onBuild(effect(Types.Action, ActionMethods.ADD).params(actionParams().id(Act.festival)).build())
			.build(),
	);

	// Barracks: +2 Defense, unlocks Raid action
	registry.add(
		Building.barracks,
		building()
			.id(Building.barracks)
			.name('Barracks')
			.icon('⚔️')
			.cost(Res.materials, 3)
			.cost(Res.gold, 3)
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.defense, 2)).build())
			.onBuild(effect(Types.Action, ActionMethods.ADD).params(actionParams().id(Act.raid)).build())
			.build(),
	);

	// Fortress: +4 Defense
	registry.add(
		Building.fortress,
		building()
			.id(Building.fortress)
			.name('Fortress')
			.icon('🏰')
			.cost(Res.materials, 5)
			.cost(Res.gold, 4)
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.defense, 4)).build())
			.build(),
	);

	// Town Hall: +2 Pop cap, unlocks Decree action
	registry.add(
		Building.townHall,
		building()
			.id(Building.townHall)
			.name('Town Hall')
			.icon('🏛️')
			.cost(Res.materials, 5)
			.cost(Res.gold, 5)
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.populationCap, 2)).build())
			.onBuild(effect(Types.Action, ActionMethods.ADD).params(actionParams().id(Act.decree)).build())
			.build(),
	);

	// Monument: +8 VP, +1 Influence/turn
	registry.add(
		Building.monument,
		building()
			.id(Building.monument)
			.name('Monument')
			.icon('🗿')
			.cost(Res.materials, 4)
			.cost(Res.gold, 7)
			.onBuild(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.vp, 8)).build())
			.onGainIncomeStep(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Res.influence, 1)).build())
			.build(),
	);

	return registry;
}
