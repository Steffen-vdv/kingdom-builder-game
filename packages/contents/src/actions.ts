/**
 * Action Definitions
 *
 * This file defines all game actions using pure builder patterns.
 * Each action is self-contained with inline values for clarity.
 *
 * For non-technical content maintainers:
 * - Each action() call creates a new action definition
 * - Chain methods like .id(), .name(), .icon() to set properties
 * - Use .effect() to add what happens when the action is performed
 * - Use .requirement() to add conditions that must be met
 * - Always end with .build() to finalize the action
 */
import { actionSchema, type ActionConfig, Registry } from '@kingdom-builder/protocol';
import { Resource } from './internal';
import { DevelopmentId } from './developments';
import { BuildingId } from './buildingIds';
import {
	action,
	compareRequirement,
	effect,
	resourceEvaluator,
	landEvaluator,
	actionParams,
	buildingParams,
	developmentParams,
	actionEffectGroup,
	actionEffectGroupOption,
	actionEffectGroupOptionParams,
	attackParams,
	passiveParams,
	resultModParams,
	costModParams,
} from './infrastructure/builders';
import {
	ActionMethods,
	AttackMethods,
	BuildingMethods,
	CostModMethods,
	DevelopmentMethods,
	LandMethods,
	PassiveMethods,
	ResourceMethods,
	ResultModMethods,
	Types,
} from './infrastructure/builderShared';
import { Focus } from './infrastructure/defs';
import {
	ActionId as ActionIdValues,
	BasicActionId as BasicActionIdValues,
	BuildActionId as BuildActionIdValues,
	DevelopActionId as DevelopActionIdValues,
	HireActionId as HireActionIdValues,
	SystemActionId as SystemActionIdValues,
	DEVELOPMENT_ACTION_IDS,
	BUILDING_ACTION_IDS,
	POPULATION_ACTION_IDS,
	PopulationEvaluationId as PopulationEvaluationIdValues,
	type ActionId as ActionIdType,
	type BasicActionId as BasicActionIdType,
	type BuildingActionId as BuildingActionIdType,
	type DevelopmentActionId as DevelopmentActionIdType,
	type PopulationActionId as PopulationActionIdType,
	type PopulationEvaluationId as PopulationEvaluationIdType,
	type SystemActionId as SystemActionIdType,
} from './actionIds';
import { ActionCategoryId as ActionCategoryValues, type ActionCategoryId as ActionCategoryIdValue } from './actionCategories';
import { resourceAmountChange, resourceTransferAmount, resourceTransferPercent } from './infrastructure/helpers/resourceEffects';
import { ReconciliationMode, resourceChange } from './resource';

// Re-export IDs for external consumers
export const ActionId = ActionIdValues;
export const ActionCategory = ActionCategoryValues;
export const BasicActions = BasicActionIdValues;
export const DevelopActions = DevelopActionIdValues;
export const HireActions = HireActionIdValues;
export const BuildActions = BuildActionIdValues;
export const SystemActions = SystemActionIdValues;
export const PopulationEvaluationId = PopulationEvaluationIdValues;

export { DEVELOPMENT_ACTION_IDS, BUILDING_ACTION_IDS, POPULATION_ACTION_IDS };

export type ActionId = ActionIdType;
export type BasicActionId = BasicActionIdType;
export type DevelopmentActionId = DevelopmentActionIdType;
export type PopulationActionId = PopulationActionIdType;
export type BuildingActionId = BuildingActionIdType;
export type SystemActionId = SystemActionIdType;
export type PopulationEvaluationId = PopulationEvaluationIdType;

export interface ActionDef extends ActionConfig {
	category?: ActionCategoryIdValue;
	order?: number;
	focus?: Focus;
}

// Shared requirement for actions that need a development slot
const developmentSlotRequirement = compareRequirement().left(landEvaluator()).operator('gt').right(0).message('Requires an available development slot.').build();

// Shared requirement for population capacity
const populationCapacityRequirement = compareRequirement()
	.left(resourceEvaluator().resourceId(Resource.populationTotal))
	.operator('lt')
	.right(resourceEvaluator().resourceId(Resource.populationMax))
	.build();

// Reconciliation modes for plunder
const plunderReconciliation = {
	donorMode: ReconciliationMode.PASS,
	recipientMode: ReconciliationMode.CLAMP,
};

export function createActionRegistry() {
	const registry = new Registry<ActionDef>(actionSchema.passthrough());

	// ═══════════════════════════════════════════════════════════════════════════
	// BASIC ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		BasicActionIdValues.expand,
		action()
			.id(BasicActionIdValues.expand)
			.name('Expand')
			.icon('🌱')
			.cost(Resource.gold, 2)
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build())
			.category(ActionCategory.Basic)
			.order(1)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BasicActionIdValues.tax,
		action()
			.id(BasicActionIdValues.tax)
			.name('Tax')
			.icon('💰')
			.effect(
				effect()
					.evaluator(resourceEvaluator().resourceId(Resource.populationTotal).id(PopulationEvaluationId.tax))
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.gold, 4)).build())
					.effect(
						effect(Types.Resource, ResourceMethods.REMOVE)
							.params(resourceAmountChange(Resource.happiness, 0.5, { roundingMode: 'down', reconciliation: true }))
							.build(),
					)
					.build(),
			)
			.category(ActionCategory.Basic)
			.order(3)
			.focus(Focus.Economy)
			.build(),
	);

	// Royal Decree effect group
	const royalDecreeDevelopGroup = actionEffectGroup('royal_decree_develop')
		.layout('compact')
		.option(
			actionEffectGroupOption('royal_decree_house')
				.icon('🏠')
				.action(DevelopActionIdValues.develop_house)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionIdValues.develop_house).developmentId(DevelopmentId.House).landId('$landId')),
		)
		.option(
			actionEffectGroupOption('royal_decree_farm')
				.icon('🌾')
				.action(DevelopActionIdValues.develop_farm)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionIdValues.develop_farm).developmentId(DevelopmentId.Farm).landId('$landId')),
		)
		.option(
			actionEffectGroupOption('royal_decree_outpost')
				.icon('🏹')
				.action(DevelopActionIdValues.develop_outpost)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionIdValues.develop_outpost).developmentId(DevelopmentId.Outpost).landId('$landId')),
		)
		.option(
			actionEffectGroupOption('royal_decree_watchtower')
				.icon('🗼')
				.action(DevelopActionIdValues.develop_watchtower)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionIdValues.develop_watchtower).developmentId(DevelopmentId.Watchtower).landId('$landId')),
		);

	registry.add(
		BasicActionIdValues.royal_decree,
		action()
			.id(BasicActionIdValues.royal_decree)
			.name('Royal Decree')
			.icon('📜')
			.cost(Resource.gold, 12)
			.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.expand)).build())
			.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.till).landId('$landId')).build())
			.effectGroup(royalDecreeDevelopGroup)
			.effect(
				effect(Types.Resource, ResourceMethods.REMOVE)
					.params(resourceAmountChange(Resource.happiness, 3, { reconciliation: true }))
					.build(),
			)
			.category(ActionCategory.Basic)
			.order(5)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BasicActionIdValues.raid,
		action()
			.id(BasicActionIdValues.raid)
			.name('Raid')
			.icon('🗡️')
			.requirement(compareRequirement().left(resourceEvaluator().resourceId(Resource.warWeariness)).operator('lt').right(resourceEvaluator().resourceId(Resource.legion)).build())
			.effect(
				effect(Types.Attack, AttackMethods.PERFORM)
					.params(
						attackParams()
							.powerResource(Resource.armyStrength)
							.absorptionResource(Resource.absorption)
							.fortificationResource(Resource.fortificationStrength)
							.targetResource(Resource.castleHP)
							.onDamageAttacker(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.plunder)).build()),
					)
					.build(),
			)
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.warWeariness).amount(1).build()).build())
			.category(ActionCategory.Basic)
			.order(6)
			.focus(Focus.Aggressive)
			.build(),
	);

	registry.add(
		BasicActionIdValues.hold_festival,
		action()
			.id(BasicActionIdValues.hold_festival)
			.name('Hold Festival')
			.icon('🎉')
			.cost(Resource.gold, 3)
			.requirement(compareRequirement().left(resourceEvaluator().resourceId(Resource.warWeariness)).operator('eq').right(0).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 3)).build())
			.effect(effect(Types.Resource, ResourceMethods.REMOVE).params(resourceChange(Resource.fortificationStrength).amount(3).reconciliation().build()).build())
			.effect(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(passiveParams().id('hold_festival_penalty').name('Festival Hangover').icon('🤮').removeOnUpkeepStep())
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('hold_festival_attack_happiness_penalty').actionId(BasicActionIdValues.raid))
							.effect(
								effect(Types.Resource, ResourceMethods.REMOVE)
									.params(resourceAmountChange(Resource.happiness, 3, { reconciliation: true }))
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
		BasicActionIdValues.plunder,
		action()
			.id(BasicActionIdValues.plunder)
			.name('Plunder')
			.icon('🏴‍☠️')
			.system()
			.effect(
				effect(Types.Resource, ResourceMethods.TRANSFER)
					.params(resourceTransferAmount(Resource.happiness, 1, plunderReconciliation))
					.build(),
			)
			.effect(
				effect(Types.Resource, ResourceMethods.TRANSFER)
					.params(resourceTransferPercent(Resource.gold, 25, plunderReconciliation))
					.build(),
			)
			.category(ActionCategory.Basic)
			.focus(Focus.Aggressive)
			.build(),
	);

	registry.add(
		BasicActionIdValues.plow,
		action()
			.id(BasicActionIdValues.plow)
			.name('Plow')
			.icon('🚜')
			.system()
			.cost(Resource.gold, 6)
			.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.expand)).build())
			.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.till)).build())
			.effect(
				effect(Types.Passive, PassiveMethods.ADD)
					.params(passiveParams().id('plow_cost_mod').name('Furrow Focus').icon('🌱').removeOnUpkeepStep())
					.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('plow_cost_all').resourceId(Resource.gold).amount(2)).build())
					.build(),
			)
			.category(ActionCategory.Basic)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BasicActionIdValues.till,
		action().id(BasicActionIdValues.till).name('Till').icon('🧑‍🌾').system().effect(effect(Types.Land, LandMethods.TILL).build()).category(ActionCategory.Basic).focus(Focus.Economy).build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// HIRE ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		HireActionIdValues.hire_council,
		action()
			.id(HireActionIdValues.hire_council)
			.name('Hire Council')
			.icon('⚖️')
			.cost(Resource.gold, 5)
			.requirement(populationCapacityRequirement)
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.council).amount(1).build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build())
			.category(ActionCategory.Hire)
			.order(100)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		HireActionIdValues.hire_legion,
		action()
			.id(HireActionIdValues.hire_legion)
			.name('Hire Legion')
			.icon('🎖️')
			.cost(Resource.gold, 5)
			.requirement(populationCapacityRequirement)
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.legion).amount(1).build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build())
			.category(ActionCategory.Hire)
			.order(101)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		HireActionIdValues.hire_fortifier,
		action()
			.id(HireActionIdValues.hire_fortifier)
			.name('Hire Fortifier')
			.icon('🔧')
			.cost(Resource.gold, 5)
			.requirement(populationCapacityRequirement)
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.fortifier).amount(1).build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build())
			.category(ActionCategory.Hire)
			.order(102)
			.focus(Focus.Economy)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// DEVELOP ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		DevelopActionIdValues.develop_house,
		action()
			.id(DevelopActionIdValues.develop_house)
			.name('House')
			.icon('🏠')
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.House).landId('$landId').build()).build())
			.category(ActionCategory.Develop)
			.order(200)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		DevelopActionIdValues.develop_farm,
		action()
			.id(DevelopActionIdValues.develop_farm)
			.name('Farm')
			.icon('🌾')
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Farm).landId('$landId').build()).build())
			.category(ActionCategory.Develop)
			.order(201)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		DevelopActionIdValues.develop_outpost,
		action()
			.id(DevelopActionIdValues.develop_outpost)
			.name('Outpost')
			.icon('🏹')
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Outpost).landId('$landId').build()).build())
			.category(ActionCategory.Develop)
			.order(202)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		DevelopActionIdValues.develop_watchtower,
		action()
			.id(DevelopActionIdValues.develop_watchtower)
			.name('Watchtower')
			.icon('🗼')
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Watchtower).landId('$landId').build()).build())
			.category(ActionCategory.Develop)
			.order(203)
			.focus(Focus.Economy)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// BUILD ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		BuildActionIdValues.build_town_charter,
		action()
			.id(BuildActionIdValues.build_town_charter)
			.name('Town Charter')
			.icon('🏘️')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.TownCharter).build()).build())
			.category(ActionCategory.Build)
			.order(300)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_mill,
		action()
			.id(BuildActionIdValues.build_mill)
			.name('Mill')
			.icon('⚙️')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Mill).build()).build())
			.category(ActionCategory.Build)
			.order(301)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_raiders_guild,
		action()
			.id(BuildActionIdValues.build_raiders_guild)
			.name("Raider's Guild")
			.icon('🏴‍☠️')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.RaidersGuild).build()).build())
			.category(ActionCategory.Build)
			.order(302)
			.focus(Focus.Aggressive)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_plow_workshop,
		action()
			.id(BuildActionIdValues.build_plow_workshop)
			.name('Plow Workshop')
			.icon('🏭')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.PlowWorkshop).build()).build())
			.category(ActionCategory.Build)
			.order(303)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_market,
		action()
			.id(BuildActionIdValues.build_market)
			.name('Market')
			.icon('🏪')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Market).build()).build())
			.category(ActionCategory.Build)
			.order(304)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_barracks,
		action()
			.id(BuildActionIdValues.build_barracks)
			.name('Barracks')
			.icon('🪖')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Barracks).build()).build())
			.category(ActionCategory.Build)
			.order(305)
			.focus(Focus.Aggressive)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_citadel,
		action()
			.id(BuildActionIdValues.build_citadel)
			.name('Citadel')
			.icon('🏯')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Citadel).build()).build())
			.category(ActionCategory.Build)
			.order(306)
			.focus(Focus.Defense)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_castle_walls,
		action()
			.id(BuildActionIdValues.build_castle_walls)
			.name('Castle Walls')
			.icon('🧱')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.CastleWalls).build()).build())
			.category(ActionCategory.Build)
			.order(307)
			.focus(Focus.Defense)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_castle_gardens,
		action()
			.id(BuildActionIdValues.build_castle_gardens)
			.name('Castle Gardens')
			.icon('🌷')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.CastleGardens).build()).build())
			.category(ActionCategory.Build)
			.order(308)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_temple,
		action()
			.id(BuildActionIdValues.build_temple)
			.name('Temple')
			.icon('⛪')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Temple).build()).build())
			.category(ActionCategory.Build)
			.order(309)
			.focus(Focus.Other)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_palace,
		action()
			.id(BuildActionIdValues.build_palace)
			.name('Palace')
			.icon('👑')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Palace).build()).build())
			.category(ActionCategory.Build)
			.order(310)
			.focus(Focus.Other)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_great_hall,
		action()
			.id(BuildActionIdValues.build_great_hall)
			.name('Great Hall')
			.icon('🏟️')
			.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.GreatHall).build()).build())
			.category(ActionCategory.Build)
			.order(311)
			.focus(Focus.Other)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// SYSTEM ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		SystemActionIdValues.initial_setup,
		action()
			.id(SystemActionIdValues.initial_setup)
			.name('Initial Setup')
			.icon('🎮')
			.system()
			.free()
			// Resources
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.gold).amount(10).reject().build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(10).reject().build()).build())
			// Stats
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(1).reject().build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.25).reject().build()).build())
			// Population
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.council).amount(1).reject().build()).build())
			// Lands
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.Farm).build())
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.build(),
	);

	registry.add(
		SystemActionIdValues.initial_setup_devmode,
		action()
			.id(SystemActionIdValues.initial_setup_devmode)
			.name('Initial Setup (Dev Mode)')
			.icon('🛠️')
			.system()
			.free()
			// Resources (dev mode gets more)
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.gold).amount(100).reject().build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.happiness).amount(10).reject().build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(10).reject().build()).build())
			// Stats
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(1).reject().build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.25).reject().build()).build())
			// Population (dev mode gets more)
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.council).amount(2).reject().build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.legion).amount(1).reject().build()).build())
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.fortifier).amount(1).reject().build()).build())
			// First land with Farm
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.Farm).build())
			// Six lands with Houses
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.House).build())
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.House).build())
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.House).build())
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.House).build())
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.House).build())
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
			.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.House).build())
			// Three empty lands
			.effect(effect(Types.Land, LandMethods.ADD).param('count', 3).build())
			.build(),
	);

	registry.add(
		SystemActionIdValues.compensation,
		action()
			.id(SystemActionIdValues.compensation)
			.name('Player Compensation')
			.icon('⚖️')
			.system()
			.free()
			.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.ap).amount(1).reject().build()).build())
			.build(),
	);

	return registry;
}

export const ACTIONS = createActionRegistry();

/**
 * Metadata for the "Action" concept as a keyword.
 * Used in modifier translations and UI when referring to actions generically.
 */
export const ACTION_INFO = {
	icon: '🎯',
	label: 'Action',
	plural: 'Actions',
} as const;
