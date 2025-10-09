import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	GameConfig,
	PopulationConfig,
	ResourceDefinition,
} from '../config/schema';
import type {
	SessionAdvanceResult,
	SessionPlayerId,
	SessionSnapshot,
} from './index';

export interface SessionIdentifier {
	sessionId: string;
}

export type SessionPlayerNameMap = Partial<Record<SessionPlayerId, string>>;

export interface SessionRegistryEntry<Definition> {
	id: string;
	definition: Definition;
}

export interface SessionRegistries {
	actions: SessionRegistryEntry<ActionConfig>[];
	buildings: SessionRegistryEntry<BuildingConfig>[];
	developments: SessionRegistryEntry<DevelopmentConfig>[];
	populations: SessionRegistryEntry<PopulationConfig>[];
	resources: SessionRegistryEntry<ResourceDefinition>[];
}

export interface SessionCreateRequest {
	devMode?: boolean;
	config?: GameConfig;
	playerNames?: SessionPlayerNameMap;
}

export interface SessionCreateResponse {
	sessionId: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistries;
}

export type SessionStateResponse = SessionCreateResponse;

export interface SessionAdvanceRequest extends SessionIdentifier {}

export interface SessionAdvanceResponse extends SessionStateResponse {
	advance: SessionAdvanceResult;
}

export interface SessionSetDevModeRequest extends SessionIdentifier {
	enabled: boolean;
}

export type SessionSetDevModeResponse = SessionStateResponse;
