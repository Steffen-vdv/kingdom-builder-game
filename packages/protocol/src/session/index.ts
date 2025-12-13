import type { EffectDef } from '../effects';
import type {
	HappinessTierDefinition,
	PassiveMetadata,
	PhaseSkipConfig,
	WinConditionDefinition,
} from '../services';
import type { PlayerStartConfig, RequirementConfig } from '../config/schema';
import type { ActionTrace } from '../actions/contracts';
import type {
	SessionResourceCatalog,
	SessionResourceBounds,
} from './resourceCatalog';

export type {
	SessionResourceBoundOfConfig,
	SessionResourceBoundType,
	SessionResourceBoundReference,
	SessionResourceBoundValue,
	SessionResourceReconciliationMode,
	SessionResourceTierThreshold,
	SessionResourceTierDefinition,
	SessionResourceTierTrackMetadata,
	SessionResourceTierTrack,
	SessionResourceMetadata,
	SessionResourceBounds,
	SessionResourceGlobalCostConfig,
	SessionResourceSection,
	SessionResourceDefinition,
	SessionResourceGroupParent,
	SessionResourceGroupDefinition,
	SessionResourceRegistry,
	SessionResourceGroupRegistry,
	SessionResourceCategoryItem,
	SessionResourceCategoryDefinition,
	SessionResourceCategoryRegistry,
	SessionResourceCatalog,
} from './resourceCatalog';

export type SessionPlayerId = 'A' | 'B';

export type SessionResourceSourceLink = {
	type?: string;
	id?: string;
	detail?: string;
	extra?: Record<string, unknown>;
};

export interface SessionResourceSourceMeta {
	sourceKey: string;
	longevity: 'ongoing' | 'permanent';
	kind?: string;
	id?: string;
	detail?: string;
	instance?: string;
	dependsOn?: SessionResourceSourceLink[];
	removal?: SessionResourceSourceLink;
	effect?: {
		type?: string;
		method?: string;
	};
	extra?: Record<string, unknown>;
}

export interface SessionResourceSourceContribution {
	amount: number;
	meta: SessionResourceSourceMeta;
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
	resourceTouched: Record<string, boolean>;
	/**
	 * Resource value map - the canonical source of truth for all resource
	 * values including currencies, stats, and population counts.
	 */
	values: Record<string, number>;
	/**
	 * Resource lower/upper bound map aligned with {@link values}. Always
	 * present so consumers can clamp projections.
	 */
	resourceBounds: Record<string, SessionResourceBounds>;
	lands: SessionLandSnapshot[];
	buildings: string[];
	actions: string[];
	resourceSources: Record<
		string,
		Record<string, SessionResourceSourceContribution>
	>;
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
	/**
	 * Session-level Resource catalog. Always emitted alongside the game
	 * snapshot to describe resources and groups available in the session.
	 */
	resourceCatalog: SessionResourceCatalog;
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
	/** All resource changes keyed by Resource id. */
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
	onPayUpkeepStep?: EffectDef[];
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
	resourceId: string;
	amount: number;
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
	/** Plural form of the label (e.g., "Actions" for "Action") */
	plural?: string;
}

export type SessionOverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
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
	text?: string;
	condition?: string;
}

export interface SessionSnapshotMetadata {
	effectLogs?: SessionEffectLogMap;
	passiveEvaluationModifiers: SessionPassiveEvaluationModifierMap;
	buildings?: Record<string, SessionMetadataDescriptor>;
	developments?: Record<string, SessionMetadataDescriptor>;
	/**
	 * Resource metadata map containing icons, labels, and display hints for
	 * each resource ID. Present when resources surface in snapshots.
	 */
	resources?: Record<string, SessionMetadataDescriptor>;
	/**
	 * Optional Resource group metadata map. Mirrors
	 * {@link resources} but scoped to group/parent descriptors.
	 */
	resourceGroups?: Record<string, SessionMetadataDescriptor>;
	phases?: Record<string, SessionPhaseMetadata>;
	triggers?: Record<string, SessionTriggerMetadata>;
	assets?: Record<string, SessionMetadataDescriptor>;
	overview?: SessionOverviewMetadata;
}

export interface SessionSnapshot {
	game: SessionGameSnapshot;
	phases: SessionPhaseDefinition[];
	actionCostResource: string;
	recentResourceGains: SessionRecentResourceGain[];
	compensations: Record<SessionPlayerId, PlayerStartConfig>;
	/**
	 * Initial setup action traces per player, captured by the engine
	 * during game creation. Used to log initial setup actions.
	 */
	initialSetupTraces: Record<SessionPlayerId, ActionTrace[]>;
	rules: SessionRuleSnapshot;
	passiveRecords: Record<SessionPlayerId, SessionPassiveRecordSnapshot[]>;
	metadata: SessionSnapshotMetadata;
	/**
	 * Resource metadata snapshot that mirrors
	 * {@link SessionSnapshotMetadata.resources}. Present when resources
	 * are active in the session.
	 */
	resourceMetadata?: Record<string, SessionMetadataDescriptor>;
	/**
	 * Optional Resource group metadata snapshot that mirrors
	 * {@link SessionSnapshotMetadata.resourceGroups}. Will be populated
	 * once Resource groups ship through the session pipeline.
	 */
	resourceGroupMetadata?: Record<string, SessionMetadataDescriptor>;
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
