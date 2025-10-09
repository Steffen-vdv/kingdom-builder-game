import type { EffectDef } from '../effects';
import type {
	HappinessTierDefinition,
	PassiveMetadata,
	PhaseSkipConfig,
	WinConditionDefinition,
} from '../services';
import type { PlayerStartConfig, RequirementConfig } from '../config/schema';

export type SessionPlayerId = 'A' | 'B';

export type SessionStatSourceLink = {
	type?: string;
	id?: string;
	detail?: string;
	extra?: Record<string, unknown>;
};

export interface SessionStatSourceMeta {
	key: string;
	longevity: 'ongoing' | 'permanent';
	kind?: string;
	id?: string;
	detail?: string;
	instance?: string;
	dependsOn?: SessionStatSourceLink[];
	removal?: SessionStatSourceLink;
	effect?: {
		type?: string;
		method?: string;
	};
	extra?: Record<string, unknown>;
}

export interface SessionStatSourceContribution {
	amount: number;
	meta: SessionStatSourceMeta;
}

export interface SessionLandSnapshot {
	id: string;
	slotsMax: number;
	slotsUsed: number;
	tilled: boolean;
	developments: string[];
	upkeep?: Record<string, number>;
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
}

export interface SessionPassiveSummary {
	id: string;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: PassiveMetadata;
}

export interface SessionPlayerStateSnapshot {
	id: SessionPlayerId;
	name: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	statsHistory: Record<string, boolean>;
	population: Record<string, number>;
	lands: SessionLandSnapshot[];
	buildings: string[];
	actions: string[];
	statSources: Record<string, Record<string, SessionStatSourceContribution>>;
	skipPhases: Record<string, Record<string, true>>;
	skipSteps: Record<string, Record<string, Record<string, true>>>;
	passives: SessionPassiveSummary[];
}

export interface SessionGameConclusionSnapshot {
	conditionId: string;
	winnerId: SessionPlayerId;
	loserId: SessionPlayerId;
	triggeredBy: SessionPlayerId;
}

export interface SessionGameSnapshot {
	turn: number;
	currentPlayerIndex: number;
	currentPhase: string;
	currentStep: string;
	phaseIndex: number;
	stepIndex: number;
	devMode: boolean;
	players: SessionPlayerStateSnapshot[];
	activePlayerId: SessionPlayerId;
	opponentId: SessionPlayerId;
	conclusion?: SessionGameConclusionSnapshot;
}

export interface SessionAdvanceSkipSourceSnapshot {
	id: string;
	detail?: string;
	meta?: PassiveMetadata;
}

export interface SessionAdvanceSkipSnapshot {
	type: 'phase' | 'step';
	phaseId: string;
	stepId?: string;
	sources: SessionAdvanceSkipSourceSnapshot[];
}

export interface SessionPhaseStepDefinition {
	id: string;
	title?: string;
	effects?: EffectDef[];
	triggers?: string[];
}

export interface SessionPhaseDefinition {
	id: string;
	steps: SessionPhaseStepDefinition[];
	action?: boolean;
	icon?: string;
	label?: string;
}

export interface SessionAdvanceResult {
	phase: string;
	step: string;
	effects: EffectDef[];
	player: SessionPlayerStateSnapshot;
	skipped?: SessionAdvanceSkipSnapshot;
}

export interface SessionPassiveRecordSnapshot extends SessionPassiveSummary {
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	owner: SessionPlayerId;
	detail?: string;
	meta?: PassiveMetadata;
	skip?: PhaseSkipConfig;
	[trigger: string]: unknown;
}

export interface SessionRuleSnapshot {
	tieredResourceKey: string;
	tierDefinitions: HappinessTierDefinition[];
	winConditions: WinConditionDefinition[];
}

export interface SessionRecentResourceGain {
	key: string;
	amount: number;
}

export type SessionEffectLogMap = Record<string, ReadonlyArray<unknown>>;

export type SessionPassiveEvaluationModifierMap = Record<
	string,
	ReadonlyArray<string>
>;

export interface SessionSnapshotMetadata {
	effectLogs?: SessionEffectLogMap;
	passiveEvaluationModifiers: SessionPassiveEvaluationModifierMap;
}

export interface SessionSnapshot {
	game: SessionGameSnapshot;
	phases: SessionPhaseDefinition[];
	actionCostResource: string;
	recentResourceGains: SessionRecentResourceGain[];
	compensations: Record<SessionPlayerId, PlayerStartConfig>;
	rules: SessionRuleSnapshot;
	passiveRecords: Record<SessionPlayerId, SessionPassiveRecordSnapshot[]>;
	metadata: SessionSnapshotMetadata;
}

export interface SessionActionDefinitionSummary {
	id: string;
	name: string;
	system?: boolean;
}

export type SessionActionCostMap = Partial<Record<string, number>>;

export interface SessionRequirementFailure {
	requirement: RequirementConfig;
	details?: Record<string, unknown>;
	message?: string;
}

export type SessionActionRequirementList = SessionRequirementFailure[];

export type {
	SessionIdentifier,
	SessionPlayerNameMap,
	SessionRegistries,
	SessionRegistryEntry,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionStateResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
} from './contracts';

export * as contracts from './contracts';
export type { SessionGateway } from './gateway';
