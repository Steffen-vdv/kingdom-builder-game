import type {
	ActionCategoryConfig,
	ActionConfig,
	ActionEffectGroup,
	BuildingConfig,
	DevelopmentConfig,
	GameConfig,
	PopulationConfig,
	PhaseConfig,
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
	ResourceCategoryDefinition,
	ResourceDefinition,
	ResourceGroupDefinition,
} from '../resource';

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
	actionCategories?: SessionActionCategoryRegistry;
	/**
	 * Registry of concrete resource definitions. Always present for every
	 * session payload.
	 */
	resources: SerializedRegistry<ResourceDefinition>;
	/**
	 * Resource registry of group definitions (including virtual parents).
	 * Mirrors {@link resources} and is always provided with session
	 * registries.
	 */
	resourceGroups: SerializedRegistry<ResourceGroupDefinition>;
	/**
	 * Resource registry of category definitions that group resources and
	 * resource groups into UI rows. Always provided with session registries.
	 */
	resourceCategories: SerializedRegistry<ResourceCategoryDefinition>;
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
	rules: RuleSet;
	primaryIconId: string | null;
	/**
	 * Resource registry snapshot mirroring
	 * {@link SessionRegistriesPayload.resources}. Always present for
	 * clients consuming runtime configuration data.
	 */
	resources: SerializedRegistry<ResourceDefinition>;
	/**
	 * Resource group registry snapshot mirroring
	 * {@link SessionRegistriesPayload.resourceGroups}. Always provided
	 * for clients consuming runtime configuration data.
	 */
	resourceGroups: SerializedRegistry<ResourceGroupDefinition>;
	/**
	 * Resource category registry snapshot mirroring
	 * {@link SessionRegistriesPayload.resourceCategories}. Always provided
	 * for clients consuming runtime configuration data.
	 */
	resourceCategories: SerializedRegistry<ResourceCategoryDefinition>;
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
