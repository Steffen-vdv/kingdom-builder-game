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
export {
	createEngineSession,
	type EngineSession,
	type EngineSessionSnapshot,
	type EngineAdvanceResult,
	type AdvanceSkipSnapshot,
	type AdvanceSkipSourceSnapshot,
	type GameSnapshot,
	type PlayerStateSnapshot,
	type LandSnapshot,
	type EngineSessionGetActionCosts,
	type EngineSessionGetActionRequirements,
	cloneEffectLogEntry,
	clonePassiveEvaluationMods,
} from './runtime/session';
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
/**
 * @deprecated Use @kingdom-builder/protocol instead.
 */
export { Registry } from '@kingdom-builder/protocol';
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
/**
 * @deprecated Use @kingdom-builder/protocol instead.
 */
export type { EvaluatorDef } from '@kingdom-builder/protocol';
export { registerCoreRequirements, RequirementRegistry } from './requirements';
export type { RequirementHandler, RequirementDef } from './requirements';
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
export type { GameConfig } from '@kingdom-builder/protocol';
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
