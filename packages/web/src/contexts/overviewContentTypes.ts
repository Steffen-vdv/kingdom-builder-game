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

export interface OverviewListItemTemplate {
	readonly icon?: string | undefined;
	readonly label: string;
	readonly body: ReadonlyArray<string>;
}

export interface OverviewParagraphTemplate {
	readonly kind: 'paragraph';
	readonly id: string;
	readonly icon: string;
	readonly title: string;
	readonly span?: boolean | undefined;
	readonly paragraphs: ReadonlyArray<string>;
}

export interface OverviewListTemplate {
	readonly kind: 'list';
	readonly id: string;
	readonly icon: string;
	readonly title: string;
	readonly span?: boolean | undefined;
	readonly items: ReadonlyArray<OverviewListItemTemplate>;
}

export type OverviewSectionTemplate =
	| OverviewParagraphTemplate
	| OverviewListTemplate;

export interface OverviewHeroTemplate {
	readonly badgeIcon: string;
	readonly badgeLabel: string;
	readonly title: string;
	readonly intro: string;
	readonly paragraph: string;
	readonly tokens: Readonly<Record<string, string>>;
}

export interface OverviewContentTemplate {
	readonly hero: OverviewHeroTemplate;
	readonly sections: ReadonlyArray<OverviewSectionTemplate>;
	readonly tokens: OverviewTokenCandidates;
}
