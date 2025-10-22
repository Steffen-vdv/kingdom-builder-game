export { ACTION_CATEGORIES, createActionCategoryRegistry, ActionCategoryId } from './actionCategories';
export type { ActionCategoryId as ActionCategoryIdValue } from './actionCategories';
export { ACTIONS, createActionRegistry, ActionId } from './actions';
export { BUILDINGS, createBuildingRegistry, BuildingId } from './buildings';
export { DEVELOPMENTS, createDevelopmentRegistry } from './developments';
export { POPULATIONS, createPopulationRegistry } from './populations';
export { PHASES, PhaseId, PhaseStepId, PhaseTrigger } from './phases';
export type { PhaseDef, StepDef } from './config/builders';
export type { PhaseId as PhaseIdValue, PhaseStepId as PhaseStepIdValue, PhaseTrigger as PhaseTriggerKey } from './phases';
export type { ActionCategoryConfig, ActionCategoryLayout } from './config/builders';
export { POPULATION_ROLES, PopulationRole, type PopulationRoleId } from './populationRoles';
export { Resource, type ResourceKey, RESOURCES } from './resources';
export { Stat, type StatKey, STATS } from './stats';
export {
	ResourceV2Builder,
	ResourceV2TierTrackBuilder,
	resourceV2,
	resourceV2Add,
	resourceV2LowerBoundDecrease,
	resourceV2LowerBoundIncrease,
	resourceV2Remove,
	resourceV2TierTrack,
	resourceV2Transfer,
	resourceV2UpperBoundIncrease,
	createResourceV2Registry,
	createResourceV2GroupRegistry,
	freezeOrderedValues,
	computeGroupParentMetadata,
	buildResourceV2GroupPresentationMetadata,
	deriveOrderedResourceV2Values,
	buildGlobalActionCostDeclarations,
} from './resourceV2';
export type {
	ResourceV2BoundAdjustmentDefinition,
	ResourceV2BoundAdjustmentOptions,
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	ResourceV2GroupParentInput,
	ResourceV2GroupParentMetadata,
	ResourceV2TierTrack,
	ResourceV2TransferEffectDefinition,
	ResourceV2TransferEffectOptions,
	ResourceV2TransferEndpointDefinition,
	ResourceV2TransferEndpointOptions,
	ResourceV2ValueEffectDefinition,
	ResourceV2ValueEffectOptions,
	ResourceV2ReconciliationStrategy,
	ResourceV2RoundingMode,
	ResourceV2DefinitionRegistry,
	ResourceV2GroupDefinition,
	ResourceV2GroupRegistry,
	ResourceV2GroupPresentationMetadata,
	ResourceV2OrderedValueEntry,
	ResourceV2GlobalActionCostDeclaration,
	ResourceV2GlobalActionCostConfig,
} from './resourceV2';
export { TRIGGER_INFO } from './triggers';
export { LAND_INFO, SLOT_INFO, DEVELOPMENTS_INFO } from './land';
export { UPKEEP_INFO, TRANSFER_INFO } from './assets';
export { POPULATION_INFO, POPULATION_ARCHETYPE_INFO } from './population';
export { PASSIVE_INFO } from './passive';
export { MODIFIER_INFO } from './modifiers';
export { GAME_START } from './game';
export { RULES } from './rules';
export { OVERVIEW_CONTENT, type OverviewContentTemplate, type OverviewHeroTemplate, type OverviewSectionTemplate, type OverviewTokenCandidates, type OverviewTokenCategoryName } from './overview';
export { TIER_SUMMARY_STORE, type TierSummaryStore, type TierSummaryGroup } from './tieredResources';
export { PRIMARY_ICON_ID } from './startup';
export { type ActionDef } from './actions';
export type { ActionId as ActionIdType } from './actions';
export type { BuildingDef } from './defs';
export type { DevelopmentDef } from './developments';
export type { PopulationDef, TriggerKey, Focus } from './defs';
export type { ActionEffectGroupDef, ActionEffectGroupOptionDef } from './config/builders';
export { ON_PAY_UPKEEP_STEP, ON_GAIN_INCOME_STEP, ON_GAIN_AP_STEP, BROOM_ICON, RESOURCE_TRANSFER_ICON } from './defs';
export { formatPassiveRemoval } from './text';
export { happinessModifierId, happinessPassiveId, happinessTierId, type HappinessModifierKind, type HappinessTierSlug } from './happinessHelpers';
