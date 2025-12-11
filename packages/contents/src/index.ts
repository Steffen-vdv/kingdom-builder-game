export { ACTION_CATEGORIES, createActionCategoryRegistry, ActionCategoryId } from './actionCategories';
export type { ActionCategoryId as ActionCategoryIdValue } from './actionCategories';
export { ACTIONS, createActionRegistry, ActionId } from './actions';
export { BUILDINGS, createBuildingRegistry, BuildingId } from './buildings';
export { DEVELOPMENTS, createDevelopmentRegistry } from './developments';
export { POPULATIONS, createPopulationRegistry, type PopulationDef } from './resources';
export { PHASES, PhaseId, PhaseStepId } from './phases';
export type { PhaseDef, StepDef } from './infrastructure/builders';
export type { PhaseId as PhaseIdValue, PhaseStepId as PhaseStepIdValue } from './phases';
export type { ActionCategoryConfig, ActionCategoryLayout } from './infrastructure/builders';
export { Resource, type ResourceKey, type ResourceId, getResourceId } from './internal';
export { Trigger, TRIGGER_META, type TriggerId, type TriggerMeta } from './triggers';
// Legacy exports for backwards compatibility
export { ON_GAIN_INCOME_STEP, ON_PAY_UPKEEP_STEP, ON_GAIN_AP_STEP } from './triggers';
export { LAND_INFO, SLOT_INFO, DEVELOPMENTS_INFO } from './land';
export { UPKEEP_INFO, TRANSFER_INFO } from './assets';
export { POPULATION_INFO, POPULATION_ARCHETYPE_INFO } from './population';
export { PASSIVE_INFO } from './passive';
export { MODIFIER_INFO } from './modifiers';
export { RULES } from './rules';
export { OVERVIEW_CONTENT, type OverviewContentTemplate, type OverviewHeroTemplate, type OverviewSectionTemplate, type OverviewTokenCandidates, type OverviewTokenCategoryName } from './overview';
export { TIER_SUMMARY_STORE, type TierSummaryStore, type TierSummaryGroup } from './infrastructure/tieredResources';
export { PRIMARY_ICON_ID } from './startup';
export { type ActionDef } from './actions';
export type { ActionId as ActionIdType } from './actions';
export type { BuildingDef } from './infrastructure/defs';
export type { DevelopmentDef } from './developments';
export type { TriggerKey, Focus } from './infrastructure/defs';
export type { ActionEffectGroupDef, ActionEffectGroupOptionDef } from './infrastructure/builders';
export { BROOM_ICON, RESOURCE_TRANSFER_ICON } from './infrastructure/defs';
export { formatPassiveRemoval } from './infrastructure/text';
export {
	resource,
	resourceGroup,
	resourceCategory,
	createResourceRegistry,
	createResourceGroupRegistry,
	createResourceCategoryRegistry,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	RESOURCE_CATEGORY_REGISTRY,
	buildResourceCatalog,
} from './resource';
export type {
	ResourceBuilder,
	ResourceGroupBuilder,
	ResourceCategoryBuilder,
	ResourceRegistry,
	ResourceGroupRegistry,
	ResourceCategoryRegistry,
	ResourceCatalog,
	ResourceBoundReference,
	ResourceBoundValue,
	ResourceReconciliationMode,
} from './resource';
export { happinessModifierId, happinessPassiveId, happinessTierId, type HappinessModifierKind, type HappinessTierSlug } from './infrastructure/happinessHelpers';

// Builder functions and utilities (for tests and advanced content creators)
export {
	actionEffectGroup,
	actionEffectGroupOption,
	actionEffectGroupOptionParams,
	effect,
	happinessTier,
	passiveParams,
	winCondition,
	compareRequirement,
	requirement,
} from './infrastructure/builders';
export { Types, PassiveMethods, CostModMethods, RequirementTypes, ActionMethods, ResourceMethods, LandMethods } from './infrastructure/builderShared';
