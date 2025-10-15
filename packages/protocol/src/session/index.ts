import type { EffectDef } from '../effects';
import type {
	HappinessTierDefinition,
	PassiveMetadata,
	PhaseSkipConfig,
	WinConditionDefinition,
} from '../services';
import type { PlayerStartConfig, RequirementConfig } from '../config/schema';

/**
 * Canonical alias for resource identifiers exchanged across domains.
 * See docs/domain-migration/plan-1.md for the migration contract.
 */
export type SessionResourceKey = string;

/**
 * Canonical alias for stat identifiers exchanged across domains.
 * See docs/domain-migration/plan-1.md for the migration contract.
 */
export type SessionStatKey = string;

/**
 * Canonical alias for population role identifiers exchanged across domains.
 * See docs/domain-migration/plan-1.md for the migration contract.
 */
export type SessionPopulationRoleId = string;

/**
 * Canonical alias for asset identifiers exchanged across domains.
 * See docs/domain-migration/plan-1.md for the migration contract.
 */
export type SessionAssetId = string;

export type SessionPlayerId = 'A' | 'B';

export type SessionStatSourceLink = {
	type?: string;
	id?: string;
	detail?: string;
	extra?: Record<string, unknown>;
};

export interface SessionStatSourceMeta {
	key: SessionStatKey;
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
	upkeep?: Record<SessionResourceKey, number>;
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
	resources: Record<SessionResourceKey, number>;
	stats: Record<SessionStatKey, number>;
	statsHistory: Record<SessionStatKey, boolean>;
	population: Record<SessionPopulationRoleId, number>;
	lands: SessionLandSnapshot[];
	buildings: string[];
	actions: string[];
	statSources: Record<
		SessionStatKey,
		Record<string, SessionStatSourceContribution>
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
	resources: Record<SessionResourceKey, number>;
	stats: Record<SessionStatKey, number>;
	population: Record<SessionPopulationRoleId, number>;
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
	tieredResourceKey: SessionResourceKey;
	tierDefinitions: HappinessTierDefinition[];
	winConditions: WinConditionDefinition[];
}

export interface SessionRecentResourceGain {
	key: SessionResourceKey;
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

/**
 * Canonical overview token categories for domain snapshots.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export type SessionOverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

/**
 * Token candidate map shared between content, engine, and web domains.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export type SessionOverviewTokenCandidates = Partial<
	Record<SessionOverviewTokenCategoryName, Record<string, string[]>>
>;

/**
 * Overview bullet list entry exchanged between domains.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export interface SessionOverviewListItem {
	icon?: string;
	label: string;
	body: string[];
}

/**
 * Overview paragraph block exchanged between domains.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export interface SessionOverviewParagraphSection {
	kind: 'paragraph';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	paragraphs: string[];
}

/**
 * Overview list block exchanged between domains.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export interface SessionOverviewListSection {
	kind: 'list';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	items: SessionOverviewListItem[];
}

/**
 * Overview section union exchanged between domains.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export type SessionOverviewSection =
	| SessionOverviewParagraphSection
	| SessionOverviewListSection;

/**
 * Overview hero banner exchanged between domains.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export interface SessionOverviewHero {
	badgeIcon: string;
	badgeLabel: string;
	title: string;
	intro: string;
	paragraph: string;
	tokens: Record<string, string>;
}

/**
 * Structured overview payload mirrored from content registries.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export interface SessionOverviewContent {
	hero: SessionOverviewHero;
	sections: SessionOverviewSection[];
	tokens: SessionOverviewTokenCandidates;
}

/**
 * Structured asset descriptors keyed by canonical asset identifiers.
 * See docs/domain-migration/plan-1.md for reference asset categories.
 */
export interface SessionSnapshotMetadataAssets {
	population?: SessionMetadataDescriptor;
	land?: SessionMetadataDescriptor;
	slot?: SessionMetadataDescriptor;
	passive?: SessionMetadataDescriptor;
	upkeep?: SessionMetadataDescriptor;
	[assetId: SessionAssetId]:
		| SessionMetadataDescriptor
		| Record<string, SessionMetadataDescriptor>
		| undefined;
}

/**
 * Aggregated metadata describing snapshot descriptors across domains.
 * See docs/domain-migration/plan-1.md for cross-domain expectations.
 */
export interface SessionSnapshotMetadata {
	effectLogs?: SessionEffectLogMap;
	passiveEvaluationModifiers: SessionPassiveEvaluationModifierMap;
	resources?: Record<SessionResourceKey, SessionMetadataDescriptor>;
	populations?: Record<SessionPopulationRoleId, SessionMetadataDescriptor>;
	buildings?: Record<string, SessionMetadataDescriptor>;
	developments?: Record<string, SessionMetadataDescriptor>;
	stats?: Record<SessionStatKey, SessionMetadataDescriptor>;
	phases?: Record<string, SessionPhaseMetadata>;
	triggers?: Record<string, SessionTriggerMetadata>;
	assets?: SessionSnapshotMetadataAssets;
	overview?: SessionOverviewContent;
}

export interface SessionSnapshot {
	game: SessionGameSnapshot;
	phases: SessionPhaseDefinition[];
	actionCostResource: SessionResourceKey;
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

export type SessionActionCostMap = Partial<Record<SessionResourceKey, number>>;

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
export type {
	OverviewContentTemplate,
	OverviewHeroTemplate,
	OverviewListTemplate,
	OverviewParagraphTemplate,
	OverviewSectionTemplate,
	OverviewTokenCandidates,
	OverviewTokenCategoryName,
} from './overview';

export type { SessionGateway } from './gateway';
export {
	buildPhaseMetadataMap,
	buildSessionMetadataFromContent,
	buildTriggerMetadataMap,
} from './metadataBuilder';
export type {
	PhaseDefinitionLike,
	PhaseStepDefinitionLike,
	SessionMetadataBuilderSource,
	TriggerInfoDefinitionLike,
} from './metadataBuilder';
