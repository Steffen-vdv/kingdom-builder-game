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
	 * ResourceV2 registry of concrete resources. Modern session transports
	 * populate this alongside the legacy registries; the optional flag
	 * remains only so older payload archives continue to type-check.
	 */
	resourcesV2?: SerializedRegistry<ResourceV2Definition>;
	/**
	 * ResourceV2 registry of group definitions (including virtual parents).
	 * Emitted with every post-migration registry payload. Optional purely
	 * for backwards compatibility with pre-migration fixtures.
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
	| 'resourcesV2'
	| 'resourceGroupsV2'
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
	 * ResourceV2 registry snapshot mirroring
	 * {@link SessionRegistriesPayload.resourcesV2}. Optional only when
	 * reading archived payloads created before the migration rollout.
	 */
	resourcesV2?: SerializedRegistry<ResourceV2Definition>;
	/**
	 * ResourceV2 group registry snapshot mirroring
	 * {@link SessionRegistriesPayload.resourceGroupsV2}. Post-migration
	 * transports always provide this; legacy archives may omit it.
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
