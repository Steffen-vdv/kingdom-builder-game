import type {
	SessionOverviewContent,
	SessionOverviewTokenCandidates,
} from '@kingdom-builder/protocol/session';

const DEFAULT_OVERVIEW_CONTENT: SessionOverviewContent = {
	hero: {
		badgeIcon: '🏰',
		badgeLabel: 'Overview',
		title: 'Game Overview',
		intro: '',
		paragraph: '',
		tokens: {},
	},
	sections: [],
	tokens: {},
};

const normalizeHeroTokens = (
	tokens?: Record<string, string>,
): Record<string, string> => {
	if (!tokens) {
		return {};
	}
	const entries: Record<string, string> = {};
	for (const [key, value] of Object.entries(tokens)) {
		if (typeof value === 'string') {
			entries[key] = value;
		}
	}
	return entries;
};

const normalizeSectionList = (
	sections?: SessionOverviewContent['sections'],
): SessionOverviewContent['sections'] => {
	if (!Array.isArray(sections)) {
		return [];
	}
	return sections.slice();
};

const normalizeTokenCandidates = (
	tokens?: SessionOverviewTokenCandidates,
): SessionOverviewTokenCandidates => {
	const normalized: SessionOverviewTokenCandidates = {};
	if (!tokens) {
		return normalized;
	}
	for (const [category, record] of Object.entries(tokens)) {
		if (!record || typeof record !== 'object') {
			continue;
		}
		const entries: Record<string, string[]> = {};
		for (const [token, candidates] of Object.entries(record)) {
			if (!Array.isArray(candidates)) {
				continue;
			}
			entries[token] = candidates.filter(
				(candidate): candidate is string => typeof candidate === 'string',
			);
		}
		normalized[category as keyof SessionOverviewTokenCandidates] = entries;
	}
	return normalized;
};

export const normalizeOverviewContent = (
	overview?: SessionOverviewContent,
): SessionOverviewContent => {
	if (!overview) {
		return DEFAULT_OVERVIEW_CONTENT;
	}
	const hero = overview.hero ?? DEFAULT_OVERVIEW_CONTENT.hero;
	const normalizedHero = {
		badgeIcon: hero.badgeIcon ?? DEFAULT_OVERVIEW_CONTENT.hero.badgeIcon,
		badgeLabel: hero.badgeLabel ?? DEFAULT_OVERVIEW_CONTENT.hero.badgeLabel,
		title: hero.title ?? DEFAULT_OVERVIEW_CONTENT.hero.title,
		intro: hero.intro ?? DEFAULT_OVERVIEW_CONTENT.hero.intro,
		paragraph: hero.paragraph ?? DEFAULT_OVERVIEW_CONTENT.hero.paragraph,
		tokens: normalizeHeroTokens(hero.tokens),
	};
	return {
		hero: normalizedHero,
		sections: normalizeSectionList(overview.sections),
		tokens: normalizeTokenCandidates(overview.tokens),
	};
};
