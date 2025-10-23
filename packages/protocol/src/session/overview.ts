export type SessionOverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

export type SessionOverviewTokenMap = Partial<
	Record<SessionOverviewTokenCategoryName, Record<string, string[]>>
>;

export interface SessionOverviewHero {
	badgeIcon?: string;
	badgeLabel?: string;
	title?: string;
	intro?: string;
	paragraph?: string;
	tokens?: Record<string, string>;
}

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

export interface SessionOverviewMetadata {
	hero?: SessionOverviewHero;
	sections?: SessionOverviewSection[];
	tokens?: SessionOverviewTokenMap;
}
