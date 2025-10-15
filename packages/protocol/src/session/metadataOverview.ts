import type {
	SessionOverviewContent,
	SessionOverviewHero,
	SessionOverviewListItem,
	SessionOverviewListSection,
	SessionOverviewParagraphSection,
	SessionOverviewSection,
	SessionOverviewTokenCandidates,
} from './index';
import type {
	OverviewContentTemplate,
	OverviewListTemplate,
	OverviewSectionTemplate,
	OverviewTokenCandidates as OverviewTemplateTokenCandidates,
} from './overview';

const cloneStringArray = (values: unknown): string[] => {
	if (!Array.isArray(values)) {
		return [];
	}
	const cloned: string[] = [];
	for (const value of values) {
		if (typeof value === 'string') {
			cloned.push(value);
		}
	}
	return cloned;
};

const cloneOverviewTokens = (
	tokens?: OverviewTemplateTokenCandidates,
): SessionOverviewTokenCandidates => {
	const cloned: SessionOverviewTokenCandidates = {};
	if (!tokens) {
		return cloned;
	}
	for (const [category, record] of Object.entries(tokens)) {
		if (!record || typeof record !== 'object') {
			continue;
		}
		const entries: Record<string, string[]> = {};
		for (const [token, candidates] of Object.entries(record)) {
			entries[token] = cloneStringArray(candidates);
		}
		cloned[category as keyof SessionOverviewTokenCandidates] = entries;
	}
	return cloned;
};

const cloneOverviewHero = (
	hero: OverviewContentTemplate['hero'],
): SessionOverviewHero => {
	const tokens: Record<string, string> = {};
	for (const [key, value] of Object.entries(hero.tokens ?? {})) {
		if (typeof value === 'string') {
			tokens[key] = value;
		}
	}
	return {
		badgeIcon: hero.badgeIcon,
		badgeLabel: hero.badgeLabel,
		title: hero.title,
		intro: hero.intro,
		paragraph: hero.paragraph,
		tokens,
	};
};

const cloneListItem = (
	item: OverviewListTemplate['items'][number],
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

const cloneOverviewSection = (
	section: OverviewSectionTemplate,
): SessionOverviewSection => {
	if (section.kind === 'paragraph') {
		const cloned: SessionOverviewParagraphSection = {
			kind: 'paragraph',
			id: section.id,
			icon: section.icon,
			title: section.title,
			paragraphs: cloneStringArray(section.paragraphs),
		};
		if (section.span) {
			cloned.span = true;
		}
		return cloned;
	}
	const items = section.items.map((item) => cloneListItem(item));
	const clonedList: SessionOverviewListSection = {
		kind: 'list',
		id: section.id,
		icon: section.icon,
		title: section.title,
		items,
	};
	if (section.span) {
		clonedList.span = true;
	}
	return clonedList;
};

export const buildOverviewMetadata = (
	overview?: OverviewContentTemplate,
): SessionOverviewContent | undefined => {
	if (!overview) {
		return undefined;
	}
	return {
		hero: cloneOverviewHero(overview.hero),
		sections: overview.sections.map((section) => cloneOverviewSection(section)),
		tokens: cloneOverviewTokens(overview.tokens),
	};
};
