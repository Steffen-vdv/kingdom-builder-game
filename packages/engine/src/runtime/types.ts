import type { EffectDef } from '../effects';
import type { AdvanceSkip } from '../phases/advance';
import type { PassiveSummary } from '../services';
import type { PassiveRecord } from '../services/passive_types';
import type { PlayerId, ResourceKey, StatSourceContribution } from '../state';
import type {
	PlayerStartConfig,
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

type LegacyLandSnapshot = {
	id: string;
	slotsMax: number;
	slotsUsed: number;
	tilled: boolean;
	developments: string[];
	upkeep?: Record<string, number>;
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
};

type LegacyPassiveSummary = PassiveSummary;

type LegacyPlayerStateSnapshot = {
	id: PlayerId;
	name: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	statsHistory: Record<string, boolean>;
	population: Record<string, number>;
	lands: LegacyLandSnapshot[];
	buildings: string[];
	actions: string[];
	statSources: Record<
		string,
		Record<
			string,
			{
				amount: number;
				meta: StatSourceContribution['meta'];
			}
		>
	>;
	skipPhases: Record<string, Record<string, true>>;
	skipSteps: Record<string, Record<string, Record<string, true>>>;
	passives: LegacyPassiveSummary[];
};

type LegacyGameConclusionSnapshot = {
	conditionId: string;
	winnerId: PlayerId;
	loserId: PlayerId;
	triggeredBy: PlayerId;
};

type LegacyGameSnapshot = {
	turn: number;
	currentPlayerIndex: number;
	currentPhase: string;
	currentStep: string;
	phaseIndex: number;
	stepIndex: number;
	devMode: boolean;
	players: LegacyPlayerStateSnapshot[];
	activePlayerId: PlayerId;
	opponentId: PlayerId;
	conclusion?: LegacyGameConclusionSnapshot;
};

type LegacyAdvanceSkipSourceSnapshot = {
	id: string;
	detail?: string;
	meta?: LegacyPassiveSummary['meta'];
};

type LegacyAdvanceSkipSnapshot = {
	type: AdvanceSkip['type'];
	phaseId: string;
	stepId?: string;
	sources: LegacyAdvanceSkipSourceSnapshot[];
};

type LegacyEngineAdvanceResult = {
	phase: string;
	step: string;
	effects: EffectDef[];
	player: LegacyPlayerStateSnapshot;
	skipped?: LegacyAdvanceSkipSnapshot;
};

type LegacyRecentResourceGain = {
	key: ResourceKey;
	amount: number;
};

type LegacyPassiveRecordSnapshot = Omit<PassiveRecord, 'frames'>;

type LegacyRuleSnapshot = {
	tieredResourceKey: ResourceKey;
	tierDefinitions: SessionRuleSnapshot['tierDefinitions'];
	winConditions: SessionRuleSnapshot['winConditions'];
};

type LegacyActionDefinitionSummary = {
	id: string;
	name: string;
	system?: boolean;
};

type LegacyEngineSessionSnapshot = {
	game: LegacyGameSnapshot;
	phases: SessionSnapshot['phases'];
	actionCostResource: ResourceKey;
	recentResourceGains: LegacyRecentResourceGain[];
	compensations: Record<PlayerId, PlayerStartConfig>;
	rules: LegacyRuleSnapshot;
	passiveRecords: Record<PlayerId, LegacyPassiveRecordSnapshot[]>;
};

type AssertExtends<Left, Right> = Left extends Right ? true : never;
type AssertBothWays<Left, Right> = [
	AssertExtends<Left, Right>,
	AssertExtends<Right, Left>,
];

type _LandSnapshotContract = AssertBothWays<
	LegacyLandSnapshot,
	SessionLandSnapshot
>;
type _PassiveSummaryContract = AssertBothWays<
	LegacyPassiveSummary,
	SessionPassiveSummary
>;
type _PlayerSnapshotContract = AssertBothWays<
	LegacyPlayerStateSnapshot,
	SessionPlayerStateSnapshot
>;
type _GameConclusionContract = AssertBothWays<
	LegacyGameConclusionSnapshot,
	SessionGameConclusionSnapshot
>;
type _GameSnapshotContract = AssertBothWays<
	LegacyGameSnapshot,
	SessionGameSnapshot
>;
type _AdvanceSkipSourceContract = AssertBothWays<
	LegacyAdvanceSkipSourceSnapshot,
	SessionAdvanceSkipSourceSnapshot
>;
type _AdvanceSkipContract = AssertBothWays<
	LegacyAdvanceSkipSnapshot,
	SessionAdvanceSkipSnapshot
>;
type _AdvanceResultContract = AssertBothWays<
	LegacyEngineAdvanceResult,
	SessionAdvanceResult
>;
type _RecentResourceGainContract = AssertBothWays<
	LegacyRecentResourceGain,
	SessionRecentResourceGain
>;
type _PassiveRecordContract = AssertBothWays<
	LegacyPassiveRecordSnapshot,
	SessionPassiveRecordSnapshot
>;
type _RuleSnapshotContract = AssertBothWays<
	LegacyRuleSnapshot,
	SessionRuleSnapshot
>;
type _ActionDefinitionSummaryContract = AssertBothWays<
	LegacyActionDefinitionSummary,
	SessionActionDefinitionSummary
>;
type _SessionSnapshotContract = AssertBothWays<
	LegacyEngineSessionSnapshot,
	SessionSnapshot
>;

export type LandSnapshot = SessionLandSnapshot;
export type PlayerStateSnapshot = SessionPlayerStateSnapshot;
export type GameConclusionSnapshot = SessionGameConclusionSnapshot;
export type GameSnapshot = SessionGameSnapshot;
export type AdvanceSkipSourceSnapshot = SessionAdvanceSkipSourceSnapshot;
export type AdvanceSkipSnapshot = SessionAdvanceSkipSnapshot;
export type EngineAdvanceResult = SessionAdvanceResult;
export type EngineSessionSnapshot = SessionSnapshot;
export type RuleSnapshot = SessionRuleSnapshot;
export type PassiveRecordSnapshot = SessionPassiveRecordSnapshot;
export type RecentResourceGain = SessionRecentResourceGain;
export type ActionDefinitionSummary = SessionActionDefinitionSummary;
