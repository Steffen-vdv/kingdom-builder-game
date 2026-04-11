export { ACTION_CATEGORIES, createActionCategoryRegistry, ActionCategoryId } from './actionCategories';
export type { ActionCategoryId as ActionCategoryIdValue } from './actionCategories';
export { ACTION_META_CATEGORIES, createActionMetaCategoryRegistry, MetaCategory } from './actionMetaCategories';
export type { MetaCategoryValue } from './actionMetaCategories';
export { ACTIONS, createActionRegistry, ActionId, ACTION_INFO } from './actions';
export { ResearchId, ResearchTier1Id, ResearchTier2Id, ResearchTier3Id, RESEARCH_TIER_1_IDS, RESEARCH_TIER_2_IDS, RESEARCH_TIER_3_IDS, ALL_RESEARCH_IDS } from './researchIds';
export type { ResearchId as ResearchIdType } from './researchIds';
export { BUILDINGS, createBuildingRegistry, BuildingId, BUILDING_INFO } from './buildings';
export { DEVELOPMENTS, createDevelopmentRegistry, DEVELOPMENT_INFO } from './developments';
export { PHASES, PhaseId, PhaseStepId } from './phases';
export type { PhaseDef, StepDef } from './infrastructure/builders';
export type { PhaseId as PhaseIdValue, PhaseStepId as PhaseStepIdValue } from './phases';
export type { ActionCategoryConfig, ActionCategoryLayout } from './infrastructure/builders';
export { Resource, SystemRole, type ResourceKey, type ResourceId, getResourceId } from './internal';
export type { SystemRoleValue } from './internal';
export { Trigger, TRIGGER_META, type TriggerId, type TriggerMeta } from './triggers';
// Legacy exports for backwards compatibility
export { ON_GAIN_INCOME_STEP, ON_PAY_UPKEEP_STEP, ON_GAIN_AP_STEP } from './triggers';
export { LAND_INFO, SLOT_INFO, DEVELOPMENTS_INFO } from './land';
export { UPKEEP_INFO, TRANSFER_INFO, KEYWORD_LABELS, SECTION_INFO } from './assets';
export { POPULATION_INFO, POPULATION_ARCHETYPE_INFO } from './population';
export { PASSIVE_INFO } from './passive';
export { MODIFIER_INFO } from './modifiers';
export { RULES } from './rules';
export { TIER_SUMMARY_STORE, type TierSummaryStore, type TierSummaryGroup } from './infrastructure/tieredResources';
export { PRIMARY_ICON_ID } from './startup';
export { type ActionDef } from './actions';
export type { ActionId as ActionIdType } from './actions';
export type { BuildingDef } from './infrastructure/defs';
export type { DevelopmentDef } from './developments';
export type { TriggerKey } from './infrastructure/defs';
export { Focus as FocusEnum, FocusDefinitions, type FocusValue, type FocusDefinition } from './constants';
export type { ActionEffectGroupDef, ActionEffectGroupOptionDef } from './infrastructure/builders';
export { BROOM_ICON, GENERAL_RESOURCE_ICON, RESOURCE_TRANSFER_ICON } from './infrastructure/defs';
export { formatPassiveRemoval } from '@kingdom-builder/contents-sdk';
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
export { Types, PassiveMethods, CostModMethods, RequirementTypes, ActionMethods, ResourceMethods, LandMethods } from '@kingdom-builder/contents-sdk';

// Content Package System
export { loadContentPackage, createContentLoader, CONTENT_PACKAGE_IDS, DEFAULT_CONTENT_ID } from './kingdom-builder/loader';
export type { ContentPackageId } from './kingdom-builder/loader';

// Content package factories
export { createBasePackage } from './kingdom-builder/base';
export { createDevModePackage } from './kingdom-builder/dev-mode';
export { createTutorialPackage } from './kingdom-builder/tutorial';

// System action utilities
export { findActionByRole, findActionsByRole, extractSystemActionIds } from './kingdom-builder/systemActions';
export type { SystemActionIds } from './kingdom-builder/systemActions';

// Re-export SDK types for convenience
export type { ContentPackage, ContentPackageFactory, ContentPackageLoader } from '@kingdom-builder/contents-sdk';
