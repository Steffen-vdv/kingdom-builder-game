import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	GameConfig,
	PopulationConfig,
} from '../config/schema';
import type {
	SessionAdvanceResult,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPlayerId,
	SessionSnapshot,
	SessionTriggerMetadata,
	SessionDeveloperPresetPlan,
} from './index';

export interface SessionOverviewHeroMetadata {
	badgeIcon: string;
	badgeLabel: string;
	title: string;
	intro: string;
	paragraph: string;
	tokens: Record<string, string>;
}

export interface SessionOverviewSectionItemMetadata {
	icon?: string;
	label: string;
	body: string[];
}

export interface SessionOverviewSectionMetadata {
	kind: 'paragraph' | 'list';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	paragraphs?: string[];
	items?: SessionOverviewSectionItemMetadata[];
}

export interface SessionOverviewMetadata {
	hero: SessionOverviewHeroMetadata;
	sections: SessionOverviewSectionMetadata[];
	tokens: Record<string, unknown>;
}

export interface SessionRegistriesMetadata {
	resources?: Record<string, SessionMetadataDescriptor>;
	populations?: Record<string, SessionMetadataDescriptor>;
	buildings?: Record<string, SessionMetadataDescriptor>;
	developments?: Record<string, SessionMetadataDescriptor>;
	stats?: Record<string, SessionMetadataDescriptor>;
	phases?: Record<string, SessionPhaseMetadata>;
	triggers?: Record<string, SessionTriggerMetadata>;
	assets?: Record<string, SessionMetadataDescriptor>;
	overviewContent?: SessionOverviewMetadata;
	developerPresetPlan?: SessionDeveloperPresetPlan;
}

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

export interface SessionRegistriesPayload {
	actions: SerializedRegistry<ActionConfig>;
	buildings: SerializedRegistry<BuildingConfig>;
	developments: SerializedRegistry<DevelopmentConfig>;
	populations: SerializedRegistry<PopulationConfig>;
	resources: SerializedRegistry<SessionResourceDefinition>;
	metadata?: SessionRegistriesMetadata;
}

export interface SessionCreateResponse {
	sessionId: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistriesPayload;
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

export interface SessionUpdatePlayerNameRequest extends SessionIdentifier {
	playerId: SessionPlayerId;
	playerName: string;
}

export type SessionUpdatePlayerNameResponse = SessionStateResponse;
