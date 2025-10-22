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
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
} from '../resourceV2/definitions';
import type { SessionResourceGlobalCostReference } from './resourceV2';

export interface SessionIdentifier {
	sessionId: string;
}

export type SessionPlayerNameMap = Partial<Record<SessionPlayerId, string>>;

export interface SessionCreateRequest {
	devMode?: boolean;
	config?: GameConfig;
	playerNames?: SessionPlayerNameMap;
}

export type SerializedRegistry<T> = Record<string, T>;

export type SessionActionCategoryRegistry =
	SerializedRegistry<ActionCategoryConfig>;

export interface SessionResourceRegistryPayload {
	values: SerializedRegistry<ResourceV2DefinitionConfig>;
	groups: SerializedRegistry<ResourceV2GroupDefinitionConfig>;
	globalActionCost?: SessionResourceGlobalCostReference | null;
}

export interface SessionRegistriesPayload {
	actions: SerializedRegistry<ActionConfig>;
	buildings: SerializedRegistry<BuildingConfig>;
	developments: SerializedRegistry<DevelopmentConfig>;
	populations: SerializedRegistry<PopulationConfig>;
	values: SessionResourceRegistryPayload;
	actionCategories?: SessionActionCategoryRegistry;
}

export type SessionMetadataSnapshot = Pick<
	SessionSnapshotMetadata,
	| 'values'
	| 'buildings'
	| 'developments'
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
	values: SessionResourceRegistryPayload;
	primaryIconId: string | null;
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
