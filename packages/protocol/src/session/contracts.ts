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
	SessionMetadataDescriptor,
	SessionTriggerMetadata,
} from './index';

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

export interface SessionOverviewHero {
	badgeIcon: string;
	badgeLabel: string;
	title: string;
	intro: string;
	paragraph: string;
	tokens: Record<string, string>;
}

export type SessionOverviewTokenCandidates = Partial<
	Record<string, Record<string, string[]>>
>;

export interface SessionOverviewContent {
	hero: SessionOverviewHero;
	sections: SessionOverviewSection[];
	tokens: SessionOverviewTokenCandidates;
}

export interface SessionRegistriesMetadata {
	resources: Record<string, SessionMetadataDescriptor>;
	triggers: Record<string, SessionTriggerMetadata>;
	overviewContent: SessionOverviewContent;
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
	metadata: SessionRegistriesMetadata;
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
