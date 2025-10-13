export type OverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

export type OverviewTokenCandidates = Partial<
	Record<OverviewTokenCategoryName, Record<string, string[]>>
>;

export interface OverviewHeroContent {
	badgeIcon: string;
	badgeLabel: string;
	title: string;
	intro: string;
	paragraph: string;
	tokens?: Record<string, string>;
}

export interface OverviewParagraphSectionTemplate {
	kind: 'paragraph';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	paragraphs: string[];
}

export interface OverviewListItemTemplate {
	icon?: string;
	label: string;
	body: string[];
}

export interface OverviewListSectionTemplate {
	kind: 'list';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	items: OverviewListItemTemplate[];
}

export type OverviewSectionTemplate =
	| OverviewParagraphSectionTemplate
	| OverviewListSectionTemplate;

export interface OverviewContentTemplate {
	hero: OverviewHeroContent;
	sections: OverviewSectionTemplate[];
	tokens?: OverviewTokenCandidates;
}
