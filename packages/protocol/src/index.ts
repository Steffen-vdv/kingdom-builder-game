export * as session from './session';
export * as actions from './actions';

export { Registry } from './registry';
export type { EffectDef } from './effects';
export type { EvaluatorDef } from './evaluators';
export type {
	AttackTarget,
	ResourceAttackTarget,
	StatAttackTarget,
	BuildingAttackTarget,
} from './effects/attack';
export {
	TRANSFER_PCT_EVALUATION_ID,
	TRANSFER_PCT_EVALUATION_TARGET,
	TRANSFER_PCT_EVALUATION_TYPE,
} from './effects/resource_transfer';
export {
	requirementSchema,
	effectSchema,
	actionEffectGroupSchema,
	actionEffectSchema,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	startConfigSchema,
	gameConfigSchema,
	validateGameConfig,
} from './config/schema';
export type {
	RequirementConfig,
	EffectConfig,
	ActionEffectGroup,
	ActionEffectGroupOption,
	ActionEffect,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	PlayerStartConfig,
	StartConfig,
	StartModeConfig,
	StartModesConfig,
	GameConfig,
} from './config/schema';
export type {
	PhaseSkipConfig,
	PhaseSkipStep,
	PassiveMetadata,
	PassiveRemovalMetadata,
	PassiveSourceMetadata,
	TierRange,
	TierPassivePreview,
	TierPassiveTextTokens,
	TierDisplayMetadata,
	TierEffect,
	HappinessTierDefinition,
	WinConditionOutcome,
	WinConditionDefinition,
	WinConditionDisplay,
	WinConditionTrigger,
	WinConditionResult,
	RuleSet,
} from './services';
export type {
	SessionPlayerId,
	SessionStatSourceLink,
	SessionStatSourceMeta,
	SessionStatSourceContribution,
	SessionLandSnapshot,
	SessionPassiveSummary,
	SessionPlayerStateSnapshot,
	SessionGameConclusionSnapshot,
	SessionGameSnapshot,
	SessionAdvanceSkipSourceSnapshot,
	SessionAdvanceSkipSnapshot,
	SessionPhaseStepDefinition,
	SessionPhaseDefinition,
	SessionAdvanceResult,
	SessionPassiveRecordSnapshot,
	SessionRuleSnapshot,
	SessionRecentResourceGain,
	SessionSnapshot,
	SessionActionDefinitionSummary,
	SessionActionCostMap,
	SessionRequirementFailure,
	SessionActionRequirementList,
} from './session';
export type {
	SessionIdentifier,
	SessionPlayerNameMap,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionStateResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
} from './session/contracts';
export type { SessionGateway } from './session/gateway';
export type {
	ActionEffectChoice,
	ActionChoiceMap,
	ActionParametersPayload,
	ActionExecuteRequest,
	ActionTraceLandSnapshot,
	ActionPlayerSnapshot,
	ActionTrace,
	ActionExecuteSuccessResponse,
	ActionExecuteErrorResponse,
	ActionExecuteResponse,
} from './actions/contracts';
export {
	sessionIdSchema,
	sessionPlayerNameMapSchema,
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionStateResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
	sessionSetDevModeRequestSchema,
	sessionSetDevModeResponseSchema,
} from './config/session_contracts';
export {
	actionEffectChoiceSchema,
	actionChoiceMapSchema,
	actionParametersSchema,
	actionTraceLandSnapshotSchema,
	actionPlayerSnapshotSchema,
	actionTraceSchema,
	actionRequirementFailureSchema,
	actionExecuteRequestSchema,
	actionExecuteSuccessResponseSchema,
	actionExecuteErrorResponseSchema,
	actionExecuteResponseSchema,
} from './config/action_contracts';
