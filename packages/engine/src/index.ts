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
/**
 * @deprecated Use createEngineSession instead.
 */
export { EngineContext } from './context';
/**
 * @deprecated Use createEngineSession instead.
 */
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
export type { EffectHandler, EffectCostCollector } from './effects';
/**
 * @deprecated Use @kingdom-builder/protocol instead.
 */
export type { EffectDef } from '@kingdom-builder/protocol';
export {
	registerCoreEvaluators,
	EvaluatorRegistry,
	/**
	 * @deprecated Use createEngineSession instead.
	 */
	EVALUATORS,
} from './evaluators';
export type { EvaluatorHandler } from './evaluators';
export { registerCoreRequirements, RequirementRegistry } from './requirements';
export type {
	RequirementHandler,
	RequirementDef,
	RequirementFailure,
} from './requirements';
/**
 * @deprecated Use @kingdom-builder/protocol instead.
 */
export { validateGameConfig } from '@kingdom-builder/protocol';
export type {
	ActionEffect,
	ActionEffectGroup as ActionEffectGroupConfig,
} from '@kingdom-builder/protocol';
/**
 * @deprecated Use @kingdom-builder/protocol instead.
 */
export type { EvaluatorDef } from '@kingdom-builder/protocol';
export { resolveAttack } from './effects/attack';
export type {
	AttackLog,
	AttackEvaluationLog,
	AttackOnDamageLogEntry,
	AttackPlayerDiff,
	AttackPowerLog,
} from './effects/attack';
/**
 * @deprecated Use @kingdom-builder/protocol instead.
 */
export type { GameConfig } from '@kingdom-builder/protocol';
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
export type { PhaseDef } from './phases';
export type { HappinessTierDefinition } from './services';
