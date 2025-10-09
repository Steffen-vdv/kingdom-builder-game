import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	GameConfig,
	PopulationConfig,
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

export interface SessionCreateRequest {
	devMode?: boolean;
	config?: GameConfig;
	playerNames?: SessionPlayerNameMap;
}

export interface SessionCreateResponse {
	sessionId: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistryPayload;
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

export interface SessionResourceDefinition {
	key: string;
	icon: string;
	label: string;
	description: string;
	tags?: string[] | undefined;
}

export type SessionRegistryRecord<Definition> = Record<string, Definition>;

export interface SessionRegistryPayload {
	actions: SessionRegistryRecord<ActionConfig>;
	buildings: SessionRegistryRecord<BuildingConfig>;
	developments: SessionRegistryRecord<DevelopmentConfig>;
	populations: SessionRegistryRecord<PopulationConfig>;
	resources: SessionRegistryRecord<SessionResourceDefinition>;
}
