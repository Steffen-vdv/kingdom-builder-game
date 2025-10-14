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

export type OverviewParagraphTemplate = {
	kind: 'paragraph';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	paragraphs: string[];
};

export type OverviewListTemplate = {
	kind: 'list';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	items: Array<{
		icon?: string;
		label: string;
		body: string[];
	}>;
};

export type OverviewSectionTemplate =
	| OverviewParagraphTemplate
	| OverviewListTemplate;

export type OverviewHeroTemplate = {
	badgeIcon: string;
	badgeLabel: string;
	title: string;
	intro: string;
	paragraph: string;
	tokens: Record<string, string>;
};

export type OverviewContentTemplate = {
	hero: OverviewHeroTemplate;
	sections: OverviewSectionTemplate[];
	tokens: OverviewTokenCandidates;
};
