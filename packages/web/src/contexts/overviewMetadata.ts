import type {
	OverviewContentTemplate,
	OverviewSectionTemplate,
	OverviewTokenCandidates as ContentOverviewTokenCandidates,
} from '@kingdom-builder/contents';
import type {
	SessionOverviewContent,
	SessionOverviewHero,
	SessionOverviewListItem,
	SessionOverviewListSection,
	SessionOverviewParagraphSection,
	SessionOverviewSection,
	SessionOverviewTokenCandidates,
	SessionOverviewTokenCategoryName,
} from '@kingdom-builder/protocol/session';

type ContentListSection = Extract<OverviewSectionTemplate, { kind: 'list' }>;
type ContentParagraphSection = Extract<
	OverviewSectionTemplate,
	{ kind: 'paragraph' }
>;

const cloneStringArray = (values: ReadonlyArray<string>): string[] => [
	...values,
];

const cloneOverviewListItem = (
	item: ContentListSection['items'][number],
): SessionOverviewListItem => {
	const cloned: SessionOverviewListItem = {
		label: item.label,
		body: cloneStringArray(item.body),
	};
	if (item.icon !== undefined) {
		cloned.icon = item.icon;
	}
	return cloned;
};

const cloneOverviewParagraphSection = (
	section: ContentParagraphSection,
): SessionOverviewParagraphSection => {
	const cloned: SessionOverviewParagraphSection = {
		kind: 'paragraph',
		id: section.id,
		icon: section.icon,
		title: section.title,
		paragraphs: cloneStringArray(section.paragraphs),
	};
	if (section.span !== undefined) {
		cloned.span = section.span;
	}
	return cloned;
};

const cloneOverviewListSection = (
	section: ContentListSection,
): SessionOverviewListSection => {
	const cloned: SessionOverviewListSection = {
		kind: 'list',
		id: section.id,
		icon: section.icon,
		title: section.title,
		items: section.items.map(cloneOverviewListItem),
	};
	if (section.span !== undefined) {
		cloned.span = section.span;
	}
	return cloned;
};

const cloneOverviewSection = (
	section: OverviewSectionTemplate,
): SessionOverviewSection => {
	if (section.kind === 'paragraph') {
		return cloneOverviewParagraphSection(section);
	}
	return cloneOverviewListSection(section as ContentListSection);
};

const cloneOverviewHero = (
	hero: OverviewContentTemplate['hero'],
): SessionOverviewHero => {
	const tokens: Record<string, string> = {};
	for (const [key, label] of Object.entries(hero.tokens)) {
		tokens[key] = label;
	}
	return {
		badgeIcon: hero.badgeIcon,
		badgeLabel: hero.badgeLabel,
		title: hero.title,
		intro: hero.intro,
		paragraph: hero.paragraph,
		tokens,
	} satisfies SessionOverviewHero;
};

const cloneOverviewTokenCandidates = (
	tokens: ContentOverviewTokenCandidates | undefined,
): SessionOverviewTokenCandidates => {
	if (!tokens) {
		return {};
	}
	const categories: SessionOverviewTokenCandidates = {};
	for (const [category, entries] of Object.entries(tokens)) {
		const record: Record<string, string[]> = {};
		for (const [tokenKey, candidates] of Object.entries(entries)) {
			record[tokenKey] = cloneStringArray(candidates);
		}
		categories[category as SessionOverviewTokenCategoryName] = record;
	}
	return categories;
};

export const buildOverviewContent = (
	template: OverviewContentTemplate,
): SessionOverviewContent => ({
	hero: cloneOverviewHero(template.hero),
	sections: template.sections.map(cloneOverviewSection),
	tokens: cloneOverviewTokenCandidates(template.tokens),
});
