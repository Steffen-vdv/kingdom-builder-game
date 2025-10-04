export {
	Resource,
	Phase,
	PopulationRole,
	Stat,
	createEngine,
} from './setup/create_engine';
export type {
	RuleSet,
	ResourceKey,
	StatKey,
	PopulationRoleId,
	StatSourceMeta,
	StatSourceContribution,
	StatSourceLink,
} from './setup/create_engine';
export { getActionCosts, getActionRequirements } from './actions/costs';
export { performAction } from './actions/action_execution';
export { advance } from './phases/advance';
export { EngineContext } from './context';
export { Services, PassiveManager } from './services';
export type { PassiveSummary } from './services';
export {
	EFFECTS,
	EFFECT_COST_COLLECTORS,
	runEffects,
	registerCoreEffects,
	EffectRegistry,
	EffectCostRegistry,
} from './effects';
export type { EffectHandler, EffectDef, EffectCostCollector } from './effects';
export {
	registerCoreEvaluators,
	EvaluatorRegistry,
	EVALUATORS,
} from './evaluators';
export type { EvaluatorHandler, EvaluatorDef } from './evaluators';
export { registerCoreRequirements, RequirementRegistry } from './requirements';
export type { RequirementHandler, RequirementDef } from './requirements';
export { validateGameConfig } from './config/schema';
export type {
	GameConfig,
	ActionConfig,
	ActionEffectGroupConfig,
	ActionEffectGroupOptionConfig,
} from './config/schema';
export { resolveAttack } from './effects/attack';
export type {
	AttackLog,
	AttackEvaluationLog,
	AttackOnDamageLogEntry,
	AttackPlayerDiff,
	AttackPowerLog,
} from './effects/attack';
export { collectTriggerEffects } from './triggers';
export { applyParamsToEffects } from './utils';
export { snapshotPlayer } from './log';
export type { PlayerSnapshot, ActionTrace } from './log';
export type { PlayerId } from './state';
export type { ActionParameters as ActionParams } from './actions/action_parameters';
export type {
	AdvanceResult,
	AdvanceSkip,
	AdvanceSkipSource,
} from './phases/advance';
