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

export interface PlayerSnapshotDeltaBucket {
	resources: Record<string, number>;
	stats: Record<string, number>;
	population: Record<string, number>;
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

export interface SessionRecentResourceGain {
	key: string;
	amount: number;
}

export type SessionEffectLogMap = Record<string, ReadonlyArray<unknown>>;

export type SessionPassiveEvaluationModifierMap = Record<
	string,
	ReadonlyArray<string>
>;

export interface SessionMetadataDescriptor {
	/**
	 * Human readable label used to describe the associated registry entry in
	 * UI surfaces. When omitted, consumers fall back to intrinsic labels
	 * from the originating registry definition.
	 */
	label?: string;
	/** Optional emoji or icon identifier attached to the descriptor. */
	icon?: string;
	/** Optional longer form description rendered in tooltip or help text. */
	description?: string;
}

export type SessionDescriptorMap<
	TDescriptor extends SessionMetadataDescriptor = SessionMetadataDescriptor,
> = Record<string, TDescriptor>;

export interface SessionStatMetadataDescriptor
	extends SessionMetadataDescriptor {
	/** Flag indicating the stat should render as a percent based value. */
	displayAsPercent?: boolean;
}

export type SessionResourceDescriptorMap = SessionDescriptorMap;

export type SessionPopulationDescriptorMap = SessionDescriptorMap;

export type SessionBuildingDescriptorMap = SessionDescriptorMap;

export type SessionDevelopmentDescriptorMap = SessionDescriptorMap;

export type SessionStatDescriptorMap =
	SessionDescriptorMap<SessionStatMetadataDescriptor>;

export interface SessionPhaseStepMetadata {
	id: string;
	label?: string;
	icon?: string;
	triggers?: string[];
}

export type SessionPhaseStepDescriptorMap =
	SessionDescriptorMap<SessionPhaseStepMetadata>;

export interface SessionPhaseMetadata {
	id?: string;
	label?: string;
	icon?: string;
	action?: boolean;
	/**
	 * Optional lookup of phase step descriptors keyed by the step identifier
	 * for quick metadata resolution in downstream consumers. Legacy payloads
	 * may still provide arrays, so consumers should normalize to a map when
	 * they require keyed lookups.
	 */
	steps?: SessionPhaseStepDescriptorMap | SessionPhaseStepMetadata[];
}

export type SessionPhaseDescriptorMap =
	SessionDescriptorMap<SessionPhaseMetadata>;

export interface SessionTriggerMetadata {
	label?: string;
	icon?: string;
	future?: string;
	past?: string;
}

export type SessionTriggerDescriptorMap =
	SessionDescriptorMap<SessionTriggerMetadata>;

export type SessionModifierDisplayDescriptor = SessionMetadataDescriptor;

/**
 * Optional overrides for modifier display labels and icons keyed by modifier
 * category (e.g., `cost`, `result`).
 */
export type SessionModifierDisplayMap =
	SessionDescriptorMap<SessionModifierDisplayDescriptor>;

/** Labels and icons for static assets rendered in snapshot driven UI. */
export interface SessionAssetDescriptorMap {
	population?: SessionMetadataDescriptor;
	land?: SessionMetadataDescriptor;
	slot?: SessionMetadataDescriptor;
	passive?: SessionMetadataDescriptor;
	upkeep?: SessionMetadataDescriptor;
}

export interface SessionOverviewHeroPayload {
	badgeIcon?: string;
	badgeLabel?: string;
	title?: string;
	intro?: string;
	paragraph?: string;
	tokens?: Record<string, string>;
}

export interface SessionOverviewListItemPayload {
	icon?: string;
	label: string;
	body: string[];
}

export interface SessionOverviewParagraphPayload {
	kind: 'paragraph';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	paragraphs: string[];
}

export interface SessionOverviewListPayload {
	kind: 'list';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	items: SessionOverviewListItemPayload[];
}

export type SessionOverviewSectionPayload =
	| SessionOverviewParagraphPayload
	| SessionOverviewListPayload;

export type SessionOverviewTokenCategoryName = string;

export type SessionOverviewTokenMap = Record<string, string[]>;

export type SessionOverviewTokenRegistry = Partial<
	Record<SessionOverviewTokenCategoryName, SessionOverviewTokenMap>
>;

/**
 * Optional overview content bundled with a snapshot so clients can render
 * hero, token, and section copy without pulling templates from the contents
 * package.
 */
export interface SessionOverviewPayload {
	hero?: SessionOverviewHeroPayload;
	tokens?: SessionOverviewTokenRegistry;
	sections?: SessionOverviewSectionPayload[];
}

/**
 * Aggregated descriptor metadata that accompanies each session snapshot. The
 * engine guarantees these registries remain stable across snapshot deliveries
 * so clients may render icons, tooltips, and overview content without
 * rehydrating full content packages.
 */
export interface SessionSnapshotMetadata {
	effectLogs?: SessionEffectLogMap;
	passiveEvaluationModifiers: SessionPassiveEvaluationModifierMap;
	resources?: SessionResourceDescriptorMap;
	populations?: SessionPopulationDescriptorMap;
	buildings?: SessionBuildingDescriptorMap;
	developments?: SessionDevelopmentDescriptorMap;
	stats?: SessionStatDescriptorMap;
	phases?: SessionPhaseDescriptorMap;
	triggers?: SessionTriggerDescriptorMap;
	modifierDisplays?: SessionModifierDisplayMap;
	assets?: SessionAssetDescriptorMap;
	overview?: SessionOverviewPayload;
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
	SessionCreateRequest,
	SessionCreateResponse,
	SessionStateResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SerializedRegistry,
} from './contracts';

export * as contracts from './contracts';
export type { SessionGateway } from './gateway';
