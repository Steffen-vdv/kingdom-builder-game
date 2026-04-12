export { ACTION_CATEGORIES, createActionCategoryRegistry, ActionCategoryId } from './kingdom-builder/content/actionCategories';
export type { ActionCategoryId as ActionCategoryIdValue } from './kingdom-builder/content/actionCategories';
export { ACTION_META_CATEGORIES, createActionMetaCategoryRegistry, MetaCategory } from './kingdom-builder/content/actionMetaCategories';
export type { MetaCategoryValue } from './kingdom-builder/content/actionMetaCategories';
export { ACTIONS, createActionRegistry, ActionId, ACTION_INFO } from './kingdom-builder/content/actions';
export { ResearchId, ResearchTier1Id, ResearchTier2Id, ResearchTier3Id, RESEARCH_TIER_1_IDS, RESEARCH_TIER_2_IDS, RESEARCH_TIER_3_IDS, ALL_RESEARCH_IDS } from './kingdom-builder/content/researchIds';
export type { ResearchId as ResearchIdType } from './kingdom-builder/content/researchIds';
export { BUILDINGS, createBuildingRegistry, BuildingId, BUILDING_INFO } from './kingdom-builder/content/buildings';
export { DEVELOPMENTS, createDevelopmentRegistry, DevelopmentId, DEVELOPMENT_INFO } from './kingdom-builder/content/developments';
export { PHASES, PhaseId, PhaseStepId } from './kingdom-builder/content/phases';
export type { PhaseDef, StepDef } from './infrastructure/builders';
export type { PhaseId as PhaseIdValue, PhaseStepId as PhaseStepIdValue } from './kingdom-builder/content/phases';
export type { ActionCategoryConfig, ActionCategoryLayout } from './infrastructure/builders';
export { Resource, SystemRole, type ResourceKey, type ResourceId, getResourceId } from './kingdom-builder/content/constants';
export type { SystemRoleValue } from './kingdom-builder/content/constants';
export { Trigger, TRIGGER_META, type TriggerId, type TriggerMeta } from './kingdom-builder/content/triggers';
// Legacy exports for backwards compatibility
export { ON_GAIN_INCOME_STEP, ON_PAY_UPKEEP_STEP, ON_GAIN_AP_STEP } from './kingdom-builder/content/triggers';
export { LAND_INFO, SLOT_INFO, DEVELOPMENTS_INFO } from './kingdom-builder/content/land';
export { UPKEEP_INFO, TRANSFER_INFO, KEYWORD_LABELS, SECTION_INFO } from './kingdom-builder/content/assets';
export { POPULATION_INFO, POPULATION_ARCHETYPE_INFO } from './kingdom-builder/content/population';
export { PASSIVE_INFO } from './kingdom-builder/content/passive';
export { MODIFIER_INFO } from './kingdom-builder/content/modifiers';
export { RULES } from './kingdom-builder/content/rules';
export { TIER_SUMMARY_STORE, type TierSummaryStore, type TierSummaryGroup } from './infrastructure/tieredResources';
export { PRIMARY_ICON_ID } from './kingdom-builder/content/startup';
export { type ActionDef } from './kingdom-builder/content/actions';
export type { ActionId as ActionIdType } from './kingdom-builder/content/actions';
export type { BuildingDef } from './infrastructure/defs';
export type { DevelopmentDef } from './kingdom-builder/content/developments';
export type { TriggerKey } from './infrastructure/defs';
export { Focus as FocusEnum, FocusDefinitions, type FocusValue, type FocusDefinition } from './kingdom-builder/content/constants';
export type { ActionEffectGroupDef, ActionEffectGroupOptionDef } from './infrastructure/builders';
export { BROOM_ICON, GENERAL_RESOURCE_ICON, RESOURCE_TRANSFER_ICON } from './infrastructure/defs';
export { formatPassiveRemoval } from '@boardsmith/contents-sdk';
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
} from './kingdom-builder/content/resource';
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
} from './kingdom-builder/content/resource';
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
export { Types, PassiveMethods, CostModMethods, RequirementTypes, ActionMethods, ResourceMethods, LandMethods } from '@boardsmith/contents-sdk';

// Content Package System
export { loadContentPackage, createContentLoader, CONTENT_PACKAGE_IDS, CONTENT_PACKAGE_META, DEFAULT_CONTENT_ID } from './kingdom-builder/loader';
export type { ContentPackageId, ContentPackageMetaEntry } from './kingdom-builder/loader';

// Content package factories
export { createBasePackage } from './kingdom-builder/base';
export { createDevModePackage } from './kingdom-builder/dev-mode';
export { createTutorialPackage } from './kingdom-builder/tutorial';
export { createByteSizedEmpirePackage } from './byte-sized-empire';

// System action utilities
export { findActionByRole, findActionsByRole, extractSystemActionIds } from './kingdom-builder/systemActions';
export type { SystemActionIds } from './kingdom-builder/systemActions';

// Re-export SDK types for convenience
export type { ContentPackage, ContentPackageFactory, ContentPackageLoader } from '@boardsmith/contents-sdk';
