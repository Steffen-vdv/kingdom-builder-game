export type OverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

export type OverviewTokenCandidateRecord = Record<
	string,
	ReadonlyArray<string>
>;

export type OverviewTokenCandidates = Partial<
	Record<OverviewTokenCategoryName, OverviewTokenCandidateRecord>
>;

export interface OverviewHeroContent {
	badgeIcon: string;
	badgeLabel: string;
	title: string;
	intro: string;
	paragraph: string;
	tokens: Record<string, string>;
}

export interface OverviewParagraphSectionTemplate {
	kind: 'paragraph';
	id: string;
	icon?: string;
	title: string;
	paragraphs: ReadonlyArray<string>;
	span?: boolean;
}

export interface OverviewListSectionItemTemplate {
	icon?: string;
	label: string;
	body: ReadonlyArray<string>;
}

export interface OverviewListSectionTemplate {
	kind: 'list';
	id: string;
	icon?: string;
	title: string;
	items: ReadonlyArray<OverviewListSectionItemTemplate>;
	span?: boolean;
}

export type OverviewSectionTemplate =
	| OverviewParagraphSectionTemplate
	| OverviewListSectionTemplate;

export interface OverviewContentTemplate {
	hero: OverviewHeroContent;
	sections: ReadonlyArray<OverviewSectionTemplate>;
	tokens?: OverviewTokenCandidates;
}
