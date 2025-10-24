export {
	Resource,
	Phase,
	PopulationRole,
	Stat,
	createEngine,
} from './setup/create_engine';
export type {
	ResourceKey,
	StatKey,
	PopulationRoleId,
	StatSourceMeta,
	StatSourceContribution,
	StatSourceLink,
} from './setup/create_engine';
export {
	createEngineSession,
	type EngineSession,
	type EngineSessionGetActionCosts,
	type EngineSessionGetActionRequirements,
	cloneEffectLogEntry,
	clonePassiveEvaluationMods,
	type DeveloperPresetOptions,
} from './runtime/session';
export { createLocalSessionGateway } from './runtime/session_gateway';
export type {
	SessionSnapshot as EngineSessionSnapshot,
	SessionAdvanceResult as EngineAdvanceResult,
	SessionAdvanceSkipSnapshot as AdvanceSkipSnapshot,
	SessionAdvanceSkipSourceSnapshot as AdvanceSkipSourceSnapshot,
	SessionGameSnapshot as GameSnapshot,
	SessionGameConclusionSnapshot as GameConclusionSnapshot,
	SessionPlayerStateSnapshot as PlayerStateSnapshot,
	SessionLandSnapshot as LandSnapshot,
	SessionRuleSnapshot as RuleSnapshot,
	SessionPassiveRecordSnapshot as PassiveRecordSnapshot,
	SessionActionDefinitionSummary as ActionDefinitionSummary,
} from '@kingdom-builder/protocol';
export {
	simulateUpcomingPhases,
	type SimulateUpcomingPhasesOptions,
	type SimulateUpcomingPhasesIds,
	type SimulateUpcomingPhasesResult,
	type PlayerSnapshotDeltaBucket,
} from './runtime/simulate_upcoming_phases';
export { getActionCosts, getActionRequirements } from './actions/costs';
export { performAction, simulateAction } from './actions/action_execution';
export {
	getActionEffectGroups,
	coerceActionEffectGroupChoices,
	resolveActionEffects,
	type ActionEffectGroup,
	type ActionEffectGroupOption,
	type ActionEffectGroupChoice,
	type ActionEffectGroupChoiceMap,
	type ResolvedActionEffects,
	type ResolvedActionEffectGroup,
	type ResolvedActionEffectGroupOption,
	type ResolvedActionEffectStep,
} from './actions/effect_groups';
export { advance } from './phases/advance';
export type { PassiveSummary } from './services';
export {
	EFFECTS,
	EFFECT_COST_COLLECTORS,
	runEffects,
	registerCoreEffects,
	EffectRegistry,
	EffectCostRegistry,
} from './effects';
export type { EffectHandler, EffectCostCollector } from './effects';
export { registerCoreEvaluators, EvaluatorRegistry } from './evaluators';
export type { EvaluatorHandler } from './evaluators';
export { registerCoreRequirements, RequirementRegistry } from './requirements';
export type {
	RequirementHandler,
	RequirementDef,
	RequirementFailure,
} from './requirements';
export { resolveAttack } from './effects/attack';
export type {
	AttackLog,
	AttackEvaluationLog,
	AttackOnDamageLogEntry,
	AttackPlayerDiff,
	AttackPowerLog,
} from '@kingdom-builder/protocol';
export { collectTriggerEffects } from './triggers';
export { applyParamsToEffects } from '@kingdom-builder/protocol';
export { snapshotPlayer } from './log';
export type { PlayerSnapshot, ActionTrace } from './log';
export type { PlayerId } from './state';
export type { ActionParameters as ActionParams } from './actions/action_parameters';
export type {
	AdvanceResult,
	AdvanceSkip,
	AdvanceSkipSource,
} from './phases/advance';
export type { PhaseDef } from './phases';
export type { HappinessTierDefinition } from './services';
