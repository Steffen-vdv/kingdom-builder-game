export type SessionMetadataAliasCandidate = string | ReadonlyArray<string>;

export type SessionMetadataAliasCategory = Record<
	string,
	SessionMetadataAliasCandidate
>;

export interface SessionMetadataAliasMap {
	actions?: SessionMetadataAliasCategory;
	resources?: SessionMetadataAliasCategory;
	stats?: SessionMetadataAliasCategory;
	populations?: SessionMetadataAliasCategory;
	buildings?: SessionMetadataAliasCategory;
	developments?: SessionMetadataAliasCategory;
	phases?: SessionMetadataAliasCategory;
	triggers?: SessionMetadataAliasCategory;
	assets?: SessionMetadataAliasCategory;
}

export type SessionOverviewTokenCandidate = string | ReadonlyArray<string>;

export type SessionOverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

export type SessionOverviewTokenCategoryConfig = Record<
	string,
	SessionOverviewTokenCandidate
>;

export type SessionOverviewTokenConfig = Partial<
	Record<SessionOverviewTokenCategoryName, SessionOverviewTokenCategoryConfig>
>;

export interface SessionOverviewHeroMetadata {
	badgeIcon?: string;
	badgeLabel?: string;
	title?: string;
	intro?: string;
	paragraph?: string;
	tokens?: Record<string, string>;
}

export interface SessionOverviewListItemMetadata {
	icon?: string;
	label: string;
	body: string[];
}

interface SessionOverviewSectionMetadataBase {
	id: string;
	icon: string;
	title: string;
	span?: boolean;
}

export interface SessionOverviewParagraphSectionMetadata
	extends SessionOverviewSectionMetadataBase {
	kind: 'paragraph';
	paragraphs: string[];
}

export interface SessionOverviewListSectionMetadata
	extends SessionOverviewSectionMetadataBase {
	kind: 'list';
	items: SessionOverviewListItemMetadata[];
}

export type SessionOverviewSectionMetadata =
	| SessionOverviewParagraphSectionMetadata
	| SessionOverviewListSectionMetadata;

export interface SessionOverviewMetadata {
	hero?: SessionOverviewHeroMetadata;
	sections?: SessionOverviewSectionMetadata[];
	tokens?: SessionOverviewTokenConfig;
}
