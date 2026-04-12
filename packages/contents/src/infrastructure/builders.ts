/**
 * Infrastructure builders for Kingdom Builder content.
 *
 * Re-exports from @kingdom-builder/contents-sdk (canonical source),
 * plus game-specific extensions like ActionMetaCategoryBuilder and pool builders.
 */

// Re-export everything from contents-sdk
export {
	// Domain builders (base versions)
	ActionCategoryBuilder,
	BaseBuilder,
	BuildingBuilder,
	DevelopmentBuilder,
	InfoBuilder,
	// Evaluators
	CompareRequirementBuilder,
	EffectBuilder,
	EvaluatorBuilder,
	RequirementBuilder,
	compareEvaluator,
	developmentEvaluator,
	effect,
	landEvaluator,
	requirement,
	resourceEvaluator,
	// Action effect groups
	ActionEffectGroupBuilder,
	ActionEffectGroupOptionBuilder,
	ActionEffectGroupOptionParamsBuilder,
	actionEffectGroup,
	actionEffectGroupOption,
	actionEffectGroupOptionParams,
	// Effect params
	actionParams,
	buildingParams,
	developmentParams,
	landParams,
	passiveParams,
	// Advanced effect params
	AttackParamsBuilder,
	CostModParamsBuilder,
	EvaluationTargetBuilder,
	EvaluationTargetTypes,
	ResultModParamsBuilder,
	TARGET_EFFECT_RESOURCE_ADD,
	attackParams,
	costModParams,
	developmentTarget,
	evaluationTarget,
	globalTarget,
	populationTarget,
	resultModParams,
	// Start config
	phase,
	playerStart,
	startConfig,
	step,
	toRecord,
	// Tiers
	happinessTier,
	tierDisplay,
	tierPassiveText,
	// Utilities
	resourceAssignmentPassiveId,
	compareRequirement,
	requirementEvaluatorCompare,
	winCondition,
	action as sdkAction,
	actionCategory,
	building,
	development,
} from '@kingdom-builder/contents-sdk';

// Re-export types from contents-sdk
export type {
	ActionCategoryConfig,
	ActionCategoryLayout,
	InfoDef,
	AttackResourceAnnotation,
	AttackResourceRole,
	TargetEffect,
	ActionEffectGroupDef,
	ActionEffectGroupOptionDef,
	DevelopmentIdParam,
	PhaseDef,
	StepDef,
	WinConditionDef,
} from '@kingdom-builder/contents-sdk';

// Game-specific: ActionBuilder with tier support (overrides SDK version)
export { ActionBuilder, ActionTierBuilder, actionTier, type ActionTierConfig } from './builders/domain';

// Game-specific: ActionMetaCategoryBuilder (Kingdom Builder only)
export { ActionMetaCategoryBuilder, type ActionMetaCategoryConfig, type ActionMetaCategoryCostModel, type ActionMetaCategoryVisibilityTrigger } from './builders/domain';

// Game-specific: Pool builders for research system
export {
	pool,
	PoolBuilder,
	tierProgressionCurve,
	TierProgressionCurveBuilder,
	tierWeights,
	TierWeightsBuilder,
	type PoolConfig,
	type TierProgressionCurveConfig,
	type TierProgressionThreshold,
	type TierWeightsConfig,
} from './builders/pool';

// Game-specific: Effect params for action pool/upgrade
export { actionPoolParams, actionUpgradeParams, type ActionPoolEffectParams, type ActionUpgradeEffectParams } from './builders/effectParams';

export { resourceAddEffect } from './helpers';

// Factory functions for game-specific builders
import { ActionBuilder, ActionMetaCategoryBuilder } from './builders/domain';

export function action() {
	return new ActionBuilder();
}

export function actionMetaCategory() {
	return new ActionMetaCategoryBuilder();
}
