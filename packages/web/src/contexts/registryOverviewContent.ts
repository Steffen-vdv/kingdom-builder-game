import type {
	OverviewContentTemplate,
	OverviewListTemplate,
	OverviewParagraphTemplate,
	OverviewSectionTemplate,
	OverviewTokenCandidates,
	SessionOverviewContent,
	SessionOverviewHero,
	SessionOverviewListSection,
	SessionOverviewParagraphSection,
	SessionOverviewSection,
	SessionOverviewTokenCandidates,
} from '@kingdom-builder/protocol/session';

const EMPTY_STRING_ARRAY = Object.freeze([]) as unknown as string[];

const EMPTY_HERO_TOKENS = Object.freeze({}) as Record<string, string>;

const EMPTY_TOKEN_CANDIDATES = Object.freeze({}) as OverviewTokenCandidates;

const DEFAULT_OVERVIEW_SECTIONS = Object.freeze(
	[],
) as unknown as OverviewContentTemplate['sections'];

const DEFAULT_OVERVIEW_HERO: OverviewContentTemplate['hero'] = Object.freeze({
	badgeIcon: '',
	badgeLabel: '',
	title: 'Overview',
	intro: '',
	paragraph: '',
	tokens: EMPTY_HERO_TOKENS,
});

const DEFAULT_OVERVIEW_CONTENT: OverviewContentTemplate = Object.freeze({
	hero: DEFAULT_OVERVIEW_HERO,
	sections: DEFAULT_OVERVIEW_SECTIONS,
	tokens: EMPTY_TOKEN_CANDIDATES,
});

const cloneStringArray = (values: unknown): string[] => {
	if (!Array.isArray(values)) {
		return EMPTY_STRING_ARRAY;
	}
	const cloned: string[] = [];
	for (const value of values) {
		if (typeof value === 'string') {
			cloned.push(value);
		}
	}
	if (cloned.length === 0) {
		return EMPTY_STRING_ARRAY;
	}
	return Object.freeze(cloned) as unknown as string[];
};

const createHeroTokens = (
	tokens: Record<string, string> | undefined,
): Record<string, string> => {
	if (!tokens || Object.keys(tokens).length === 0) {
		return EMPTY_HERO_TOKENS;
	}
	const entries: Array<readonly [string, string]> = [];
	for (const [key, value] of Object.entries(tokens)) {
		if (typeof value === 'string') {
			entries.push([key, value]);
		}
	}
	if (entries.length === 0) {
		return EMPTY_HERO_TOKENS;
	}
	return Object.freeze(Object.fromEntries(entries)) as Record<string, string>;
};

const createOverviewHero = (
	hero: SessionOverviewHero | undefined,
): OverviewContentTemplate['hero'] => {
	if (!hero) {
		return DEFAULT_OVERVIEW_HERO;
	}
	const tokens = createHeroTokens(hero.tokens);
	const entry: OverviewContentTemplate['hero'] = {
		badgeIcon: hero.badgeIcon ?? DEFAULT_OVERVIEW_HERO.badgeIcon,
		badgeLabel: hero.badgeLabel ?? DEFAULT_OVERVIEW_HERO.badgeLabel,
		title: hero.title ?? DEFAULT_OVERVIEW_HERO.title,
		intro: hero.intro ?? '',
		paragraph: hero.paragraph ?? '',
		tokens,
	};
	if (
		entry.badgeIcon === DEFAULT_OVERVIEW_HERO.badgeIcon &&
		entry.badgeLabel === DEFAULT_OVERVIEW_HERO.badgeLabel &&
		entry.title === DEFAULT_OVERVIEW_HERO.title &&
		entry.intro === DEFAULT_OVERVIEW_HERO.intro &&
		entry.paragraph === DEFAULT_OVERVIEW_HERO.paragraph &&
		tokens === EMPTY_HERO_TOKENS
	) {
		return DEFAULT_OVERVIEW_HERO;
	}
	return Object.freeze(entry);
};

const createListItem = (
	item: SessionOverviewListSection['items'][number],
): OverviewListTemplate['items'][number] => {
	const body = cloneStringArray(item.body);
	const entry: OverviewListTemplate['items'][number] = {
		label: item.label ?? '',
		body,
	};
	if (item.icon !== undefined) {
		entry.icon = item.icon;
	}
	return Object.freeze(entry);
};

const createListSection = (
	section: SessionOverviewListSection,
): OverviewListTemplate => {
	const itemsSource = Array.isArray(section.items) ? section.items : [];
	const items = itemsSource.map((item) => createListItem(item));
	const entry: OverviewListTemplate = {
		kind: 'list',
		id: section.id ?? '',
		icon: section.icon ?? '',
		title: section.title ?? '',
		items: Object.freeze(items) as OverviewListTemplate['items'],
	};
	if (section.span) {
		entry.span = true;
	}
	return Object.freeze(entry);
};

const createParagraphSection = (
	section: SessionOverviewParagraphSection,
): OverviewParagraphTemplate => {
	const paragraphs = cloneStringArray(section.paragraphs);
	const entry: OverviewParagraphTemplate = {
		kind: 'paragraph',
		id: section.id ?? '',
		icon: section.icon ?? '',
		title: section.title ?? '',
		paragraphs,
	};
	if (section.span) {
		entry.span = true;
	}
	return Object.freeze(entry);
};

const createOverviewSection = (
	section: SessionOverviewSection,
): OverviewSectionTemplate | null => {
	if (section.kind === 'list') {
		return createListSection(section);
	}
	if (section.kind === 'paragraph') {
		return createParagraphSection(section);
	}
	return null;
};

const createOverviewSectionsFromMetadata = (
	sections: SessionOverviewContent['sections'] | undefined,
): OverviewContentTemplate['sections'] => {
	if (!Array.isArray(sections) || sections.length === 0) {
		return DEFAULT_OVERVIEW_SECTIONS;
	}
	const mapped = sections
		.map((section) => createOverviewSection(section))
		.filter((entry): entry is OverviewSectionTemplate => entry !== null);
	if (mapped.length === 0) {
		return DEFAULT_OVERVIEW_SECTIONS;
	}
	return Object.freeze(
		mapped,
	) as unknown as OverviewContentTemplate['sections'];
};

const createTokenEntries = (
	record: Record<string, unknown> | undefined,
): Record<string, string[]> | null => {
	if (!record) {
		return null;
	}
	const entries: Array<readonly [string, string[]]> = [];
	for (const [token, candidates] of Object.entries(record)) {
		entries.push([token, cloneStringArray(candidates)]);
	}
	if (entries.length === 0) {
		return null;
	}
	return Object.freeze(Object.fromEntries(entries)) as unknown as Record<
		string,
		string[]
	>;
};

const createTokenCandidates = (
	tokens: SessionOverviewTokenCandidates | undefined,
): OverviewTokenCandidates => {
	if (!tokens) {
		return EMPTY_TOKEN_CANDIDATES;
	}
	const entries: Array<readonly [string, Record<string, string[]>]> = [];
	for (const [category, record] of Object.entries(tokens)) {
		if (!record || typeof record !== 'object') {
			continue;
		}
		const tokenEntries = createTokenEntries(record as Record<string, unknown>);
		if (!tokenEntries) {
			continue;
		}
		entries.push([category, tokenEntries]);
	}
	if (entries.length === 0) {
		return EMPTY_TOKEN_CANDIDATES;
	}
	return Object.freeze(
		Object.fromEntries(entries),
	) as unknown as OverviewTokenCandidates;
};

export const createOverviewContentFromMetadata = (
	overview: SessionOverviewContent | undefined,
): OverviewContentTemplate => {
	if (!overview) {
		return DEFAULT_OVERVIEW_CONTENT;
	}
	const hero = createOverviewHero(overview.hero);
	const sections = createOverviewSectionsFromMetadata(overview.sections);
	const tokens = createTokenCandidates(overview.tokens);
	if (
		hero === DEFAULT_OVERVIEW_HERO &&
		sections === DEFAULT_OVERVIEW_SECTIONS &&
		tokens === EMPTY_TOKEN_CANDIDATES
	) {
		return DEFAULT_OVERVIEW_CONTENT;
	}
	return Object.freeze({ hero, sections, tokens });
};

export const getDefaultOverviewContent = (): OverviewContentTemplate =>
	DEFAULT_OVERVIEW_CONTENT;
