/**
 * Infrastructure builders for Kingdom Builder content.
 *
 * Re-exports from @kingdom-builder/contents-sdk (canonical source),
 * plus game-specific extensions like ActionMetaCategoryBuilder.
 */

// Re-export everything from contents-sdk
export {
	// Domain builders
	ActionBuilder,
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
	action,
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

// Game-specific: ActionMetaCategoryBuilder (Kingdom Builder only)
export { ActionMetaCategoryBuilder, type ActionMetaCategoryConfig, type ActionMetaCategoryCostModel, type ActionMetaCategoryVisibilityTrigger } from './builders/domain';

// Game-specific: resourceAddEffect uses internal resource constants
export { resourceAddEffect } from '../internal/resourceEffects';

// Factory function for game-specific ActionMetaCategoryBuilder
import { ActionMetaCategoryBuilder } from './builders/domain';
export function actionMetaCategory() {
	return new ActionMetaCategoryBuilder();
}
