/**
 * Action Definitions
 *
 * This file defines all game actions using pure builder patterns.
 * Each action is self-contained with inline values for clarity.
 *
 * For non-technical content maintainers:
 * - Each action() call creates a new action definition
 * - Chain methods like .id(), .name(), .icon() to set properties
 * - Use .tier(n, t => t...) to define tier-specific costs/effects/requirements
 * - Always end with .build() to finalize the action
 */
import { actionSchema, type ActionConfig, Registry } from '@kingdom-builder/protocol';
import { z, type ZodType } from 'zod';
import { Resource, SystemRole } from './internal';
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
	developmentTarget,
	populationTarget,
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
	resourceAmountChange,
	resourceTransferAmount,
	resourceTransferPercent,
} from '@kingdom-builder/contents-sdk';
import { Focus } from './infrastructure/defs';
import { PhaseId } from './phaseTypes';
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
import { MetaCategory, type MetaCategoryValue } from './constants';
import { ResearchId } from './researchIds';
import { ReconciliationMode, resourceChange } from './resource';

// Re-export IDs for external consumers
export const ActionId = ActionIdValues;
export const ActionCategory = ActionCategoryValues;
export { MetaCategory };
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
	/** Which meta-category this action belongs to. Required for all actions. */
	metaCategory: MetaCategoryValue;
	category?: ActionCategoryIdValue;
	order?: number;
	focus?: Focus;
	/** System role for system actions (e.g., 'initial-setup', 'compensation') */
	systemRole?: string;
}

/**
 * Extended action schema that includes metaCategory (required by contents layer).
 * The protocol's actionSchema doesn't include metaCategory since it's a content-layer concern.
 */
const actionDefSchema = actionSchema.extend({
	metaCategory: z.enum([MetaCategory.Commands, MetaCategory.Research]),
	category: z.string().optional(),
	order: z.number().optional(),
	focus: z.string().optional(),
});

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
	// Type assertion: schema types are compatible but exactOptionalPropertyTypes causes mismatch
	const registry = new Registry<ActionDef>(actionDefSchema as unknown as ZodType<ActionDef>);

	// ═══════════════════════════════════════════════════════════════════════════
	// BASIC ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		BasicActionIdValues.expand,
		action()
			.id(BasicActionIdValues.expand)
			.metaCategory(MetaCategory.Commands)
			.name('Expand')
			.icon('🌱')
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 2)
					.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build()),
			)
			.category(ActionCategory.Basic)
			.order(1)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BasicActionIdValues.tax,
		action()
			.id(BasicActionIdValues.tax)
			.metaCategory(MetaCategory.Commands)
			.name('Tax')
			.icon('💰')
			.tier(1, (t) =>
				t.effect(
					effect()
						.evaluator(resourceEvaluator().resourceId(Resource.populationTotal).id(PopulationEvaluationId.tax))
						.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.gold, 4)).build())
						.effect(
							effect(Types.Resource, ResourceMethods.REMOVE)
								.params(resourceAmountChange(Resource.happiness, 0.5, { roundingMode: 'down', reconciliation: true }))
								.build(),
						)
						.build(),
				),
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
			actionEffectGroupOption('royal_decree_science_lab')
				.icon('🔬')
				.action(DevelopActionIdValues.develop_science_lab)
				.params(actionEffectGroupOptionParams().actionId(DevelopActionIdValues.develop_science_lab).developmentId(DevelopmentId.ScienceLab).landId('$landId')),
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
			.metaCategory(MetaCategory.Commands)
			.name('Royal Decree')
			.icon('📜')
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 12)
					.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.expand)).build())
					.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.till).landId('$landId')).build())
					.effectGroup(royalDecreeDevelopGroup)
					.effect(
						effect(Types.Resource, ResourceMethods.REMOVE)
							.params(resourceAmountChange(Resource.happiness, 3, { reconciliation: true }))
							.build(),
					),
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
			.metaCategory(MetaCategory.Commands)
			.name('Raid')
			.icon('🗡️')
			.locked()
			.tier(1, (t) =>
				t
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
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.warWeariness).amount(1).build()).build()),
			)
			.category(ActionCategory.Basic)
			.order(6)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		BasicActionIdValues.hold_festival,
		action()
			.id(BasicActionIdValues.hold_festival)
			.metaCategory(MetaCategory.Commands)
			.name('Hold Festival')
			.icon('🎉')
			.locked()
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 5)
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 3)).build())
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('hold_festival_skip_growth').name('Festival Aftermath').icon('😴').skipPhase(PhaseId.Growth).removeOnUpkeepStep())
							.build(),
					),
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
			.metaCategory(MetaCategory.Commands)
			.name('Plunder')
			.icon('🏴‍☠️')
			.locked()
			.tier(1, (t) =>
				t
					.effect(
						effect(Types.Resource, ResourceMethods.TRANSFER)
							.params(resourceTransferAmount(Resource.happiness, 1, plunderReconciliation))
							.build(),
					)
					.effect(
						effect(Types.Resource, ResourceMethods.TRANSFER)
							.params(resourceTransferPercent(Resource.gold, 25, plunderReconciliation))
							.build(),
					),
			)
			.category(ActionCategory.Basic)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		BasicActionIdValues.plow,
		action()
			.id(BasicActionIdValues.plow)
			.metaCategory(MetaCategory.Commands)
			.name('Plow')
			.icon('🚜')
			.locked()
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 6)
					.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.expand)).build())
					.effect(effect(Types.Action, ActionMethods.PERFORM).params(actionParams().id(BasicActionIdValues.till)).build())
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('plow_cost_mod').name('Furrow Focus').icon('🌱').removeOnUpkeepStep())
							.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('plow_cost_all').resourceId(Resource.gold).amount(2)).build())
							.build(),
					),
			)
			.category(ActionCategory.Basic)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BasicActionIdValues.till,
		action()
			.id(BasicActionIdValues.till)
			.metaCategory(MetaCategory.Commands)
			.name('Till')
			.icon('🧑‍🌾')
			.system()
			.tier(1, (t) => t.effect(effect(Types.Land, LandMethods.TILL).build()))
			.category(ActionCategory.Basic)
			.focus(Focus.Economy)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// HIRE ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		HireActionIdValues.hire_council,
		action()
			.id(HireActionIdValues.hire_council)
			.metaCategory(MetaCategory.Commands)
			.name('Hire Council')
			.icon('⚖️')
			.locked()
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 5)
					.requirement(populationCapacityRequirement)
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.council).amount(1).build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build()),
			)
			.category(ActionCategory.Hire)
			.order(100)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		HireActionIdValues.hire_legion,
		action()
			.id(HireActionIdValues.hire_legion)
			.metaCategory(MetaCategory.Commands)
			.name('Hire Legion')
			.icon('🎖️')
			.locked()
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 5)
					.requirement(populationCapacityRequirement)
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.legion).amount(1).build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build()),
			)
			.category(ActionCategory.Hire)
			.order(101)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		HireActionIdValues.hire_fortifier,
		action()
			.id(HireActionIdValues.hire_fortifier)
			.metaCategory(MetaCategory.Commands)
			.name('Hire Fortifier')
			.icon('🔧')
			.locked()
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 5)
					.requirement(populationCapacityRequirement)
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.fortifier).amount(1).build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.happiness, 1)).build()),
			)
			.category(ActionCategory.Hire)
			.order(102)
			.focus(Focus.Economy)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// DEVELOP ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		DevelopActionIdValues.develop_farm,
		action()
			.id(DevelopActionIdValues.develop_farm)
			.metaCategory(MetaCategory.Commands)
			.name('Farm')
			.icon('🌾')
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 3)
					.requirement(developmentSlotRequirement)
					.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Farm).landId('$landId').build()).build()),
			)
			.category(ActionCategory.Basic)
			.order(200)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		DevelopActionIdValues.develop_science_lab,
		action()
			.id(DevelopActionIdValues.develop_science_lab)
			.metaCategory(MetaCategory.Commands)
			.name('Science Lab')
			.icon('🔬')
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 3)
					.requirement(developmentSlotRequirement)
					.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.ScienceLab).landId('$landId').build()).build()),
			)
			.category(ActionCategory.Basic)
			.order(201)
			.focus(Focus.Research)
			.build(),
	);

	registry.add(
		DevelopActionIdValues.develop_house,
		action()
			.id(DevelopActionIdValues.develop_house)
			.metaCategory(MetaCategory.Commands)
			.name('House')
			.icon('🏠')
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 3)
					.requirement(developmentSlotRequirement)
					.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.House).landId('$landId').build()).build()),
			)
			.category(ActionCategory.Basic)
			.order(202)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		DevelopActionIdValues.develop_outpost,
		action()
			.id(DevelopActionIdValues.develop_outpost)
			.metaCategory(MetaCategory.Commands)
			.name('Outpost')
			.icon('🏹')
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 3)
					.requirement(developmentSlotRequirement)
					.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Outpost).landId('$landId').build()).build()),
			)
			.category(ActionCategory.Basic)
			.order(204)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		DevelopActionIdValues.develop_watchtower,
		action()
			.id(DevelopActionIdValues.develop_watchtower)
			.metaCategory(MetaCategory.Commands)
			.name('Watchtower')
			.icon('🗼')
			.tier(1, (t) =>
				t
					.cost(Resource.gold, 3)
					.requirement(developmentSlotRequirement)
					.effect(effect(Types.Development, DevelopmentMethods.ADD).params(developmentParams().id(DevelopmentId.Watchtower).landId('$landId').build()).build()),
			)
			.category(ActionCategory.Basic)
			.order(205)
			.focus(Focus.Combat)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// BUILD ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		BuildActionIdValues.build_town_charter,
		action()
			.id(BuildActionIdValues.build_town_charter)
			.metaCategory(MetaCategory.Commands)
			.name('Town Charter')
			.icon('🏘️')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.TownCharter).build()).build()))
			.category(ActionCategory.Build)
			.order(300)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_mill,
		action()
			.id(BuildActionIdValues.build_mill)
			.metaCategory(MetaCategory.Commands)
			.name('Mill')
			.icon('⚙️')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Mill).build()).build()))
			.category(ActionCategory.Build)
			.order(301)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_raiders_guild,
		action()
			.id(BuildActionIdValues.build_raiders_guild)
			.metaCategory(MetaCategory.Commands)
			.name("Raider's Guild")
			.icon('🏴‍☠️')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.RaidersGuild).build()).build()))
			.category(ActionCategory.Build)
			.order(302)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_plow_workshop,
		action()
			.id(BuildActionIdValues.build_plow_workshop)
			.metaCategory(MetaCategory.Commands)
			.name('Plow Workshop')
			.icon('🏭')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.PlowWorkshop).build()).build()))
			.category(ActionCategory.Build)
			.order(303)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_market,
		action()
			.id(BuildActionIdValues.build_market)
			.metaCategory(MetaCategory.Commands)
			.name('Market')
			.icon('🏪')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Market).build()).build()))
			.category(ActionCategory.Build)
			.order(304)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_barracks,
		action()
			.id(BuildActionIdValues.build_barracks)
			.metaCategory(MetaCategory.Commands)
			.name('Barracks')
			.icon('🪖')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Barracks).build()).build()))
			.category(ActionCategory.Build)
			.order(305)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_citadel,
		action()
			.id(BuildActionIdValues.build_citadel)
			.metaCategory(MetaCategory.Commands)
			.name('Citadel')
			.icon('🏯')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Citadel).build()).build()))
			.category(ActionCategory.Build)
			.order(306)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_castle_walls,
		action()
			.id(BuildActionIdValues.build_castle_walls)
			.metaCategory(MetaCategory.Commands)
			.name('Castle Walls')
			.icon('🧱')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.CastleWalls).build()).build()))
			.category(ActionCategory.Build)
			.order(307)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_castle_gardens,
		action()
			.id(BuildActionIdValues.build_castle_gardens)
			.metaCategory(MetaCategory.Commands)
			.name('Castle Gardens')
			.icon('🌷')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.CastleGardens).build()).build()))
			.category(ActionCategory.Build)
			.order(308)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_temple,
		action()
			.id(BuildActionIdValues.build_temple)
			.metaCategory(MetaCategory.Commands)
			.name('Temple')
			.icon('⛪')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Temple).build()).build()))
			.category(ActionCategory.Build)
			.order(309)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_palace,
		action()
			.id(BuildActionIdValues.build_palace)
			.metaCategory(MetaCategory.Commands)
			.name('Palace')
			.icon('👑')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.Palace).build()).build()))
			.category(ActionCategory.Build)
			.order(310)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		BuildActionIdValues.build_great_hall,
		action()
			.id(BuildActionIdValues.build_great_hall)
			.metaCategory(MetaCategory.Commands)
			.name('Great Hall')
			.icon('🏟️')
			.locked()
			.oneTime()
			.tier(1, (t) => t.effect(effect(Types.Building, BuildingMethods.ADD).params(buildingParams().id(BuildingId.GreatHall).build()).build()))
			.category(ActionCategory.Build)
			.order(311)
			.focus(Focus.Economy)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// SYSTEM ACTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		SystemActionIdValues.initial_setup,
		action()
			.id(SystemActionIdValues.initial_setup)
			.metaCategory(MetaCategory.Commands)
			.name('Initial Setup')
			.icon('🎮')
			.system(SystemRole.INITIAL_SETUP)
			.free()
			.tier(1, (t) =>
				t
					// Resources
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.gold).amount(10).reject().build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(100).reject().build()).build())
					// Stats
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(1).reject().build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.25).reject().build()).build())
					// Population
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.council).amount(1).reject().build()).build())
					// Lands
					.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
					.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.Farm).build())
					.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build()),
			)
			.build(),
	);

	registry.add(
		SystemActionIdValues.initial_setup_devmode,
		action()
			.id(SystemActionIdValues.initial_setup_devmode)
			.metaCategory(MetaCategory.Commands)
			.name('Initial Setup (Dev Mode)')
			.icon('🛠️')
			.system(SystemRole.INITIAL_SETUP_DEVMODE)
			.free()
			.tier(1, (t) =>
				t
					// Resources (dev mode gets more)
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.gold).amount(100).reject().build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.happiness).amount(10).reject().build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(100).reject().build()).build())
					// Stats
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(1).reject().build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.25).reject().build()).build())
					// First land with Farm
					.effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
					.effect(effect(Types.Development, DevelopmentMethods.ADD).param('id', DevelopmentId.Farm).build())
					// Six lands with Houses (must come before population to provide capacity)
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
					// Population (dev mode gets more) - added after houses provide capacity
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.council).amount(2).reject().build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.legion).amount(1).reject().build()).build())
					.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.fortifier).amount(1).reject().build()).build()),
			)
			.build(),
	);

	registry.add(
		SystemActionIdValues.compensation,
		action()
			.id(SystemActionIdValues.compensation)
			.metaCategory(MetaCategory.Commands)
			.name('Player Compensation')
			.icon('⚖️')
			.system(SystemRole.COMPENSATION)
			.free()
			.tier(1, (t) => t.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.cp).amount(1).reject().build()).build()))
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// RESEARCH ACTIONS - TIER 1 (starting tier, multi-tier upgrade path)
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		ResearchId.iron_plows,
		action()
			.id(ResearchId.iron_plows)
			.metaCategory(MetaCategory.Research)
			.name('Iron Plows')
			.icon('🔧')
			.oneTime()
			.tier(1, (t) =>
				t.cost(Resource.research, 3).effect(
					effect(Types.ResultMod, ResultModMethods.ADD)
						.params(resultModParams().id('iron_plows_t1').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(1))
						.build(),
				),
			)
			.tier(2, (t) =>
				t
					.cost(Resource.research, 6)
					.cost(Resource.gold, 3)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('iron_plows_t2').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(1))
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 12)
					.cost(Resource.gold, 8)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('iron_plows_t3').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(2))
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.basic_masonry,
		action()
			.id(ResearchId.basic_masonry)
			.metaCategory(MetaCategory.Research)
			.name('Basic Masonry')
			.icon('🧱')
			.oneTime()
			.tier(1, (t) =>
				t.cost(Resource.research, 3).effect(
					effect(Types.Passive, PassiveMethods.ADD)
						.params(passiveParams().id('basic_masonry_t1'))
						.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(1).build()).build())
						.build(),
				),
			)
			.tier(2, (t) =>
				t
					.cost(Resource.research, 7)
					.cost(Resource.gold, 4)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('basic_masonry_t2'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(1).build()).build())
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 14)
					.cost(Resource.gold, 10)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('basic_masonry_t3'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(2).build()).build())
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.scout_training,
		action()
			.id(ResearchId.scout_training)
			.metaCategory(MetaCategory.Research)
			.name('Scout Training')
			.icon('🏃')
			.oneTime()
			.tier(1, (t) =>
				t.cost(Resource.research, 4).effect(
					effect(Types.Passive, PassiveMethods.ADD)
						.params(passiveParams().id('scout_training_t1'))
						.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.armyStrength).amount(2).build()).build())
						.build(),
				),
			)
			.tier(2, (t) =>
				t
					.cost(Resource.research, 8)
					.cost(Resource.gold, 5)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('scout_training_t2'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.armyStrength).amount(3).build()).build())
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 16)
					.cost(Resource.gold, 12)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('scout_training_t3'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.armyStrength).amount(5).build()).build())
							.build(),
					),
			)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		ResearchId.trade_routes,
		action()
			.id(ResearchId.trade_routes)
			.metaCategory(MetaCategory.Research)
			.name('Trade Routes')
			.icon('🛤️')
			.oneTime()
			.tier(1, (t) =>
				t.cost(Resource.research, 4).effect(
					effect(Types.ResultMod, ResultModMethods.ADD)
						.params(resultModParams().id('trade_routes_t1').evaluation(populationTarget().id(PopulationEvaluationId.tax)).amount(1))
						.build(),
				),
			)
			.tier(2, (t) =>
				t
					.cost(Resource.research, 9)
					.cost(Resource.gold, 6)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('trade_routes_t2').evaluation(populationTarget().id(PopulationEvaluationId.tax)).amount(1))
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 18)
					.cost(Resource.gold, 15)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('trade_routes_t3').evaluation(populationTarget().id(PopulationEvaluationId.tax)).amount(2))
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.crop_rotation,
		action()
			.id(ResearchId.crop_rotation)
			.metaCategory(MetaCategory.Research)
			.name('Crop Rotation')
			.icon('🔄')
			.oneTime()
			.tier(1, (t) =>
				t.cost(Resource.research, 3).effect(
					effect(Types.Passive, PassiveMethods.ADD)
						.params(passiveParams().id('crop_rotation_t1'))
						.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.1).build()).build())
						.build(),
				),
			)
			.tier(2, (t) =>
				t
					.cost(Resource.research, 7)
					.cost(Resource.gold, 4)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('crop_rotation_t2'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.15).build()).build())
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 14)
					.cost(Resource.gold, 10)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('crop_rotation_t3'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.25).build()).build())
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.basic_fortification,
		action()
			.id(ResearchId.basic_fortification)
			.metaCategory(MetaCategory.Research)
			.name('Basic Fortification')
			.icon('🏰')
			.oneTime()
			.tier(1, (t) =>
				t.cost(Resource.research, 4).effect(
					effect(Types.Passive, PassiveMethods.ADD)
						.params(passiveParams().id('basic_fortification_t1'))
						.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(15).build()).build())
						.build(),
				),
			)
			.tier(2, (t) =>
				t
					.cost(Resource.research, 9)
					.cost(Resource.gold, 6)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('basic_fortification_t2'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(25).build()).build())
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 18)
					.cost(Resource.gold, 15)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('basic_fortification_t3'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(40).build()).build())
							.build(),
					),
			)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		ResearchId.tax_reform,
		action()
			.id(ResearchId.tax_reform)
			.metaCategory(MetaCategory.Research)
			.name('Tax Reform')
			.icon('📊')
			.oneTime()
			.tier(1, (t) =>
				t
					.cost(Resource.research, 5)
					.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('tax_reform_t1').actionId(BasicActionIdValues.tax).resourceId(Resource.gold).amount(-1)).build()),
			)
			.tier(2, (t) =>
				t
					.cost(Resource.research, 10)
					.cost(Resource.gold, 5)
					.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('tax_reform_t2').actionId(BasicActionIdValues.tax).resourceId(Resource.gold).amount(-1)).build()),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 20)
					.cost(Resource.gold, 12)
					.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('tax_reform_t3').actionId(BasicActionIdValues.tax).resourceId(Resource.gold).amount(-2)).build()),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.festivities,
		action()
			.id(ResearchId.festivities)
			.metaCategory(MetaCategory.Research)
			.name('Festivities')
			.icon('🎊')
			.oneTime()
			.tier(1, (t) => t.cost(Resource.research, 6).effect(effect(Types.Action, ActionMethods.ADD).params(actionParams().id(BasicActionIdValues.hold_festival)).build()))
			.focus(Focus.Economy)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// RESEARCH ACTIONS - TIER 2 (start at tier 2, advanced)
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		ResearchId.steel_plows,
		action()
			.id(ResearchId.steel_plows)
			.metaCategory(MetaCategory.Research)
			.name('Steel Plows')
			.icon('⚔️')
			.oneTime()
			.tier(2, (t) =>
				t
					.cost(Resource.research, 8)
					.cost(Resource.gold, 5)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('steel_plows_t2').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(2))
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 16)
					.cost(Resource.gold, 12)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('steel_plows_t3').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(3))
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.advanced_masonry,
		action()
			.id(ResearchId.advanced_masonry)
			.metaCategory(MetaCategory.Research)
			.name('Advanced Masonry')
			.icon('🏗️')
			.oneTime()
			.tier(2, (t) =>
				t
					.cost(Resource.research, 8)
					.cost(Resource.gold, 5)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('advanced_masonry_t2'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(2).build()).build())
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 16)
					.cost(Resource.gold, 12)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('advanced_masonry_t3'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(3).build()).build())
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.military_tactics,
		action()
			.id(ResearchId.military_tactics)
			.metaCategory(MetaCategory.Research)
			.name('Military Tactics')
			.icon('📜')
			.oneTime()
			.tier(2, (t) =>
				t
					.cost(Resource.research, 10)
					.cost(Resource.gold, 8)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('military_tactics_t2'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.armyStrength).amount(5).build()).build())
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 20)
					.cost(Resource.gold, 18)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('military_tactics_t3'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.armyStrength).amount(8).build()).build())
							.build(),
					),
			)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		ResearchId.merchant_guilds,
		action()
			.id(ResearchId.merchant_guilds)
			.metaCategory(MetaCategory.Research)
			.name('Merchant Guilds')
			.icon('🏪')
			.oneTime()
			.tier(2, (t) =>
				t
					.cost(Resource.research, 8)
					.cost(Resource.gold, 6)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('merchant_guilds_t2').evaluation(populationTarget().id(PopulationEvaluationId.tax)).amount(2))
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 16)
					.cost(Resource.gold, 14)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('merchant_guilds_t3').evaluation(populationTarget().id(PopulationEvaluationId.tax)).amount(3))
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.irrigation,
		action()
			.id(ResearchId.irrigation)
			.metaCategory(MetaCategory.Research)
			.name('Irrigation')
			.icon('💧')
			.oneTime()
			.tier(2, (t) =>
				t
					.cost(Resource.research, 10)
					.cost(Resource.gold, 5)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('irrigation_t2'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.2).build()).build())
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 20)
					.cost(Resource.gold, 12)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('irrigation_t3'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.35).build()).build())
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.siege_engineering,
		action()
			.id(ResearchId.siege_engineering)
			.metaCategory(MetaCategory.Research)
			.name('Siege Engineering')
			.icon('🎯')
			.oneTime()
			.tier(2, (t) =>
				t
					.cost(Resource.research, 12)
					.cost(Resource.gold, 10)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('siege_engineering_t2'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.fortificationStrength).amount(5).build()).build())
							.build(),
					),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 24)
					.cost(Resource.gold, 20)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('siege_engineering_t3'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.fortificationStrength).amount(10).build()).build())
							.build(),
					),
			)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		ResearchId.bureaucratic_reform,
		action()
			.id(ResearchId.bureaucratic_reform)
			.metaCategory(MetaCategory.Research)
			.name('Bureaucratic Reform')
			.icon('📋')
			.oneTime()
			.tier(2, (t) =>
				t
					.cost(Resource.research, 10)
					.cost(Resource.gold, 8)
					.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('bureaucratic_reform_t2').resourceId(Resource.gold).amount(-1)).build()),
			)
			.tier(3, (t) =>
				t
					.cost(Resource.research, 20)
					.cost(Resource.gold, 18)
					.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('bureaucratic_reform_t3').resourceId(Resource.gold).amount(-2)).build()),
			)
			.focus(Focus.Economy)
			.build(),
	);

	// ═══════════════════════════════════════════════════════════════════════════
	// RESEARCH ACTIONS - TIER 3 (mastery, single tier only)
	// ═══════════════════════════════════════════════════════════════════════════

	registry.add(
		ResearchId.master_agriculture,
		action()
			.id(ResearchId.master_agriculture)
			.metaCategory(MetaCategory.Research)
			.name('Master Agriculture')
			.icon('🌾')
			.oneTime()
			.tier(3, (t) =>
				t
					.cost(Resource.research, 15)
					.cost(Resource.gold, 10)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('master_agriculture').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(3))
							.build(),
					)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('master_agriculture_growth'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.2).build()).build())
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.grand_architecture,
		action()
			.id(ResearchId.grand_architecture)
			.metaCategory(MetaCategory.Research)
			.name('Grand Architecture')
			.icon('🏛️')
			.oneTime()
			.tier(3, (t) =>
				t
					.cost(Resource.research, 18)
					.cost(Resource.gold, 15)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('grand_architecture'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(4).build()).build())
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.elite_warriors,
		action()
			.id(ResearchId.elite_warriors)
			.metaCategory(MetaCategory.Research)
			.name('Elite Warriors')
			.icon('⚔️')
			.oneTime()
			.tier(3, (t) =>
				t
					.cost(Resource.research, 20)
					.cost(Resource.gold, 20)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('elite_warriors'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.armyStrength).amount(12).build()).build())
							.build(),
					),
			)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		ResearchId.empire_trade,
		action()
			.id(ResearchId.empire_trade)
			.metaCategory(MetaCategory.Research)
			.name('Empire Trade')
			.icon('🌐')
			.oneTime()
			.tier(3, (t) =>
				t
					.cost(Resource.research, 18)
					.cost(Resource.gold, 18)
					.effect(
						effect(Types.ResultMod, ResultModMethods.ADD)
							.params(resultModParams().id('empire_trade').evaluation(populationTarget().id(PopulationEvaluationId.tax)).amount(4))
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.fertile_lands,
		action()
			.id(ResearchId.fertile_lands)
			.metaCategory(MetaCategory.Research)
			.name('Fertile Lands')
			.icon('🌳')
			.oneTime()
			.tier(3, (t) =>
				t
					.cost(Resource.research, 15)
					.cost(Resource.gold, 12)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('fertile_lands_pop'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.populationMax).amount(3).build()).build())
							.build(),
					)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('fertile_lands_growth'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.growth).amount(0.3).build()).build())
							.build(),
					),
			)
			.focus(Focus.Economy)
			.build(),
	);

	registry.add(
		ResearchId.impenetrable_fortress,
		action()
			.id(ResearchId.impenetrable_fortress)
			.metaCategory(MetaCategory.Research)
			.name('Impenetrable Fortress')
			.icon('🏯')
			.oneTime()
			.tier(3, (t) =>
				t
					.cost(Resource.research, 25)
					.cost(Resource.gold, 25)
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('impenetrable_fortress'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.castleHP).amount(80).build()).build())
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.fortificationStrength).amount(15).build()).build())
							.build(),
					),
			)
			.focus(Focus.Combat)
			.build(),
	);

	registry.add(
		ResearchId.royal_authority,
		action()
			.id(ResearchId.royal_authority)
			.metaCategory(MetaCategory.Research)
			.name('Royal Authority')
			.icon('👑')
			.oneTime()
			.tier(3, (t) =>
				t
					.cost(Resource.research, 25)
					.cost(Resource.gold, 25)
					.effect(effect(Types.CostMod, CostModMethods.ADD).params(costModParams().id('royal_authority_cost').resourceId(Resource.gold).amount(-2)).build())
					.effect(
						effect(Types.Passive, PassiveMethods.ADD)
							.params(passiveParams().id('royal_authority_happiness'))
							.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(Resource.happiness).amount(5).build()).build())
							.build(),
					),
			)
			.focus(Focus.Economy)
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
