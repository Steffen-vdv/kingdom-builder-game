import type {
	ActionCategoryConfig,
	ActionConfig,
	ActionEffectGroup,
	BuildingConfig,
	DevelopmentConfig,
	GameConfig,
	PopulationConfig,
	PhaseConfig,
	StartConfig,
} from '../config/schema';
import type {
	ActionParametersPayload,
	ActionTrace,
} from '../actions/contracts';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
	SessionAdvanceResult,
	SessionPlayerId,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SimulateUpcomingPhasesOptions,
	SimulateUpcomingPhasesResult,
} from './index';
import type { RuleSet } from '../services';
import type {
	ResourceV2Definition,
	ResourceV2GroupDefinition,
} from '../resource-v2';

export interface SessionIdentifier {
	sessionId: string;
}

export type SessionPlayerNameMap = Partial<Record<SessionPlayerId, string>>;

export interface SessionCreateRequest {
	devMode?: boolean;
	config?: GameConfig;
	playerNames?: SessionPlayerNameMap;
}

export interface SessionResourceDefinition {
	key: string;
	icon?: string;
	label?: string;
	description?: string;
	tags?: string[];
}

export type SerializedRegistry<T> = Record<string, T>;

export type SessionActionCategoryRegistry =
	SerializedRegistry<ActionCategoryConfig>;

export interface SessionRegistriesPayload {
	actions: SerializedRegistry<ActionConfig>;
	buildings: SerializedRegistry<BuildingConfig>;
	developments: SerializedRegistry<DevelopmentConfig>;
	populations: SerializedRegistry<PopulationConfig>;
	resources: SerializedRegistry<SessionResourceDefinition>;
	actionCategories?: SessionActionCategoryRegistry;
	/**
	 * ResourceV2 registry of concrete resources. Treated as first-class by
	 * post-migration clients, but remains optional for compatibility with
	 * sessions serialized before the rollout completed.
	 */
	resourcesV2?: SerializedRegistry<ResourceV2Definition>;
	/**
	 * ResourceV2 registry of group definitions (including virtual parents).
	 * Available for group-aware UIs while continuing to permit legacy
	 * sessions that predate the migration to omit the field.
	 */
	resourceGroupsV2?: SerializedRegistry<ResourceV2GroupDefinition>;
}

export type SessionMetadataSnapshot = Pick<
	SessionSnapshotMetadata,
	| 'resources'
	| 'populations'
	| 'buildings'
	| 'developments'
	| 'stats'
	| 'phases'
	| 'triggers'
	| 'assets'
	| 'overview'
>;

export interface SessionMetadataSnapshotResponse {
	registries: SessionRegistriesPayload;
	metadata: SessionMetadataSnapshot;
}

export interface SessionRuntimeConfigResponse {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	resources: SerializedRegistry<SessionResourceDefinition>;
	primaryIconId: string | null;
	/**
	 * Runtime ResourceV2 registry snapshot mirroring the registries
	 * payload. Present for migrated sessions; legacy sessions may still
	 * omit it while the transport rollout finalizes.
	 */
	resourcesV2?: SerializedRegistry<ResourceV2Definition>;
	/**
	 * Runtime ResourceV2 group registry snapshot mirroring
	 * {@link SessionRegistriesPayload.resourceGroupsV2}. Included when the
	 * session transport publishes group data but optional for backwards
	 * compatibility.
	 */
	resourceGroupsV2?: SerializedRegistry<ResourceV2GroupDefinition>;
}

export interface SessionCreateResponse {
	sessionId: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistriesPayload;
}

export type SessionStateResponse = SessionCreateResponse;

export type SessionAdvanceRequest = SessionIdentifier;

export interface SessionAdvanceResponse extends SessionStateResponse {
	advance: SessionAdvanceResult;
}

export interface SessionSetDevModeRequest extends SessionIdentifier {
	enabled: boolean;
}

export type SessionSetDevModeResponse = SessionStateResponse;

export interface SessionUpdatePlayerNameRequest extends SessionIdentifier {
	playerId: SessionPlayerId;
	playerName: string;
}

export type SessionUpdatePlayerNameResponse = SessionStateResponse;

export interface SessionActionCostRequest extends SessionIdentifier {
	actionId: string;
	params?: ActionParametersPayload;
	playerId?: SessionPlayerId;
}

export interface SessionActionCostResponse extends SessionIdentifier {
	costs: SessionActionCostMap;
}

export interface SessionActionRequirementRequest extends SessionIdentifier {
	actionId: string;
	params?: ActionParametersPayload;
	playerId?: SessionPlayerId;
}

export interface SessionActionRequirementResponse extends SessionIdentifier {
	requirements: SessionActionRequirementList;
}

export interface SessionActionOptionsRequest extends SessionIdentifier {
	actionId: string;
}

export interface SessionActionOptionsResponse extends SessionIdentifier {
	groups: ActionEffectGroup[];
}

export interface SessionRunAiRequest extends SessionIdentifier {
	playerId: SessionPlayerId;
}

export interface SessionRunAiAction {
	actionId: string;
	params?: ActionParametersPayload;
	costs: SessionActionCostMap;
	traces: ActionTrace[];
}

export interface SessionRunAiResponse extends SessionCreateResponse {
	ranTurn: boolean;
	actions: SessionRunAiAction[];
	phaseComplete: boolean;
}

export interface SessionSimulateRequest extends SessionIdentifier {
	playerId: SessionPlayerId;
	options?: SimulateUpcomingPhasesOptions;
}

export interface SessionSimulateResponse extends SessionIdentifier {
	result: SimulateUpcomingPhasesResult;
}
