import type { EffectDef } from '../effects';
import type {
	HappinessTierDefinition,
	PassiveMetadata,
	PhaseSkipConfig,
	WinConditionDefinition,
} from '../services';
import type { PlayerStartConfig, RequirementConfig } from '../config/schema';
import type {
	SessionResourceMetadataSnapshot,
	SessionResourceRecentGain,
	SessionResourceValueMap,
} from './resourceV2';

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
	aiControlled?: boolean;
	values: SessionResourceValueMap;
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

export interface PlayerSnapshotDeltaBucket {
	values: Record<string, number>;
}

export interface SimulateUpcomingPhasesIds {
	growth: string;
	upkeep: string;
}

export interface SimulateUpcomingPhasesOptions {
	phaseIds?: SimulateUpcomingPhasesIds;
	maxIterations?: number;
}

export interface SimulateUpcomingPhasesResult {
	playerId: SessionPlayerId;
	before: SessionPlayerStateSnapshot;
	after: SessionPlayerStateSnapshot;
	delta: PlayerSnapshotDeltaBucket;
	steps: SessionAdvanceResult[];
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

export type SessionEffectLogMap = Record<string, ReadonlyArray<unknown>>;

export type SessionPassiveEvaluationModifierMap = Record<
	string,
	ReadonlyArray<string>
>;

export type SessionMetadataFormat =
	| string
	| {
			prefix?: string;
			percent?: boolean;
	  };

export interface SessionMetadataDescriptor {
	label?: string;
	icon?: string;
	description?: string;
	displayAsPercent?: boolean;
	format?: SessionMetadataFormat;
}

export type SessionOverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

export type SessionOverviewTokenMap = Partial<
	Record<SessionOverviewTokenCategoryName, Record<string, string[]>>
>;

export interface SessionOverviewHero {
	badgeIcon?: string;
	badgeLabel?: string;
	title?: string;
	intro?: string;
	paragraph?: string;
	tokens?: Record<string, string>;
}

export interface SessionOverviewListItem {
	icon?: string;
	label: string;
	body: string[];
}

export interface SessionOverviewParagraphSection {
	kind: 'paragraph';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	paragraphs: string[];
}

export interface SessionOverviewListSection {
	kind: 'list';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	items: SessionOverviewListItem[];
}

export type SessionOverviewSection =
	| SessionOverviewParagraphSection
	| SessionOverviewListSection;

export interface SessionOverviewMetadata {
	hero?: SessionOverviewHero;
	sections?: SessionOverviewSection[];
	tokens?: SessionOverviewTokenMap;
}

export interface SessionPhaseStepMetadata {
	id: string;
	label?: string;
	icon?: string;
	triggers?: string[];
}

export interface SessionPhaseMetadata {
	id?: string;
	label?: string;
	icon?: string;
	action?: boolean;
	steps?: SessionPhaseStepMetadata[];
}

export interface SessionTriggerMetadata {
	label?: string;
	icon?: string;
	future?: string;
	past?: string;
}

export interface SessionSnapshotMetadata {
	effectLogs?: SessionEffectLogMap;
	passiveEvaluationModifiers: SessionPassiveEvaluationModifierMap;
	values?: Record<string, SessionMetadataDescriptor>;
	resources?: SessionResourceMetadataSnapshot;
	buildings?: Record<string, SessionMetadataDescriptor>;
	developments?: Record<string, SessionMetadataDescriptor>;
	phases?: Record<string, SessionPhaseMetadata>;
	triggers?: Record<string, SessionTriggerMetadata>;
	assets?: Record<string, SessionMetadataDescriptor>;
	overview?: SessionOverviewMetadata;
}

export interface SessionSnapshot {
	game: SessionGameSnapshot;
	phases: SessionPhaseDefinition[];
	actionCostResource: string;
	recentResourceGains: SessionResourceRecentGain[];
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
	SessionCreateRequest,
	SessionCreateResponse,
	SessionStateResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionRegistriesPayload,
	SerializedRegistry,
	SessionMetadataSnapshot,
	SessionMetadataSnapshotResponse,
	SessionActionCategoryRegistry,
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from './contracts';

export * as contracts from './contracts';
export type { SessionGateway } from './gateway';
