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
	label?: string;
	icon?: string;
	description?: string;
}

export type SessionMetadataDescriptorMap<
	TDescriptor extends SessionMetadataDescriptor = SessionMetadataDescriptor,
> = Record<string, TDescriptor>;

export interface SessionResourceMetadataDescriptor
	extends SessionMetadataDescriptor {}

export interface SessionPopulationMetadataDescriptor
	extends SessionMetadataDescriptor {}

export interface SessionBuildingMetadataDescriptor
	extends SessionMetadataDescriptor {}

export interface SessionDevelopmentMetadataDescriptor
	extends SessionMetadataDescriptor {}

export interface SessionStatMetadataDescriptor
	extends SessionMetadataDescriptor {}

export interface SessionModifierDisplayDescriptor
	extends SessionMetadataDescriptor {}

export interface SessionAssetMetadataDescriptor
	extends SessionMetadataDescriptor {}

export interface SessionPhaseStepMetadata extends SessionMetadataDescriptor {
	id: string;
	triggers?: string[];
}

export type SessionPhaseStepMetadataMap =
	SessionMetadataDescriptorMap<SessionPhaseStepMetadata>;

export type SessionPhaseStepMetadataCollection =
	| SessionPhaseStepMetadata[]
	| SessionPhaseStepMetadataMap;

export interface SessionPhaseMetadata extends SessionMetadataDescriptor {
	id?: string;
	action?: boolean;
	steps?: SessionPhaseStepMetadataCollection;
}

export type SessionPhaseMetadataMap =
	SessionMetadataDescriptorMap<SessionPhaseMetadata>;

export interface SessionTriggerMetadata extends SessionMetadataDescriptor {
	future?: string;
	past?: string;
}

export type SessionTriggerMetadataMap =
	SessionMetadataDescriptorMap<SessionTriggerMetadata>;

export interface SessionAssetMetadataMap {
	land?: SessionAssetMetadataDescriptor;
	slot?: SessionAssetMetadataDescriptor;
	passive?: SessionAssetMetadataDescriptor;
	upkeep?: SessionAssetMetadataDescriptor;
	[assetId: string]: SessionAssetMetadataDescriptor | undefined;
}

export type SessionModifierDisplayMap =
	SessionMetadataDescriptorMap<SessionModifierDisplayDescriptor>;

export type SessionResourceMetadataMap =
	SessionMetadataDescriptorMap<SessionResourceMetadataDescriptor>;

export type SessionPopulationMetadataMap =
	SessionMetadataDescriptorMap<SessionPopulationMetadataDescriptor>;

export type SessionBuildingMetadataMap =
	SessionMetadataDescriptorMap<SessionBuildingMetadataDescriptor>;

export type SessionDevelopmentMetadataMap =
	SessionMetadataDescriptorMap<SessionDevelopmentMetadataDescriptor>;

export type SessionStatMetadataMap =
	SessionMetadataDescriptorMap<SessionStatMetadataDescriptor>;

export type SessionOverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

export type SessionOverviewTokenCandidates = Partial<
	Record<SessionOverviewTokenCategoryName, Record<string, string[]>>
>;

export interface SessionOverviewHeroDescriptor {
	badgeIcon?: string;
	badgeLabel?: string;
	title?: string;
	intro?: string;
	paragraph?: string;
	tokens?: Record<string, string>;
}

export interface SessionOverviewListItemDescriptor {
	icon?: string;
	label: string;
	body: string[];
}

export interface SessionOverviewParagraphSectionDescriptor {
	kind: 'paragraph';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	paragraphs: string[];
}

export interface SessionOverviewListSectionDescriptor {
	kind: 'list';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	items: SessionOverviewListItemDescriptor[];
}

export type SessionOverviewSectionDescriptor =
	| SessionOverviewParagraphSectionDescriptor
	| SessionOverviewListSectionDescriptor;

export interface SessionOverviewContentPayload {
	hero?: SessionOverviewHeroDescriptor;
	sections?: SessionOverviewSectionDescriptor[];
	tokens?: SessionOverviewTokenCandidates;
}

export interface SessionSnapshotMetadata {
	/**
	 * Snapshot metadata now guarantees descriptor coverage for the registries,
	 * phase structure, trigger labels, modifier display strings, core asset
	 * labels, and optional overview content overrides that downstream clients
	 * can rely on for consistent UI rendering.
	 */
	effectLogs?: SessionEffectLogMap;
	passiveEvaluationModifiers: SessionPassiveEvaluationModifierMap;
	resources?: SessionResourceMetadataMap;
	populations?: SessionPopulationMetadataMap;
	buildings?: SessionBuildingMetadataMap;
	developments?: SessionDevelopmentMetadataMap;
	stats?: SessionStatMetadataMap;
	phases?: SessionPhaseMetadataMap;
	triggers?: SessionTriggerMetadataMap;
	modifierDisplays?: SessionModifierDisplayMap;
	assets?: SessionAssetMetadataMap;
	overviewContent?: SessionOverviewContentPayload;
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
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SerializedRegistry,
} from './contracts';

export * as contracts from './contracts';
export type { SessionGateway } from './gateway';
