import type {
	SessionActionDefinitionSummary,
	SessionAdvanceResult,
	SessionAdvanceSkipSnapshot,
	SessionAdvanceSkipSourceSnapshot,
	SessionGameConclusionSnapshot,
	SessionGameSnapshot,
	SessionLandSnapshot,
	SessionPassiveRecordSnapshot,
	SessionPassiveSummary,
	SessionPlayerStateSnapshot,
	SessionRecentResourceGain,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';

export type LandSnapshot = SessionLandSnapshot;
export type PlayerStateSnapshot = SessionPlayerStateSnapshot;
export type GameConclusionSnapshot = SessionGameConclusionSnapshot;
export type GameSnapshot = SessionGameSnapshot;
export type AdvanceSkipSourceSnapshot = SessionAdvanceSkipSourceSnapshot;
export type AdvanceSkipSnapshot = SessionAdvanceSkipSnapshot;
export type EngineAdvanceResult = SessionAdvanceResult;
export type EngineSessionSnapshot = SessionSnapshot;
export type PassiveRecordSnapshot = SessionPassiveRecordSnapshot;
export type PassiveSummarySnapshot = SessionPassiveSummary;
export type RecentResourceGain = SessionRecentResourceGain;
export type RuleSnapshot = SessionRuleSnapshot;
export type ActionDefinitionSummary = SessionActionDefinitionSummary;
