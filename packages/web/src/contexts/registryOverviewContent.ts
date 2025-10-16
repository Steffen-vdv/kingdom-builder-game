import type {
	OverviewContentTemplate,
	OverviewListTemplate,
	OverviewTokenCandidates,
	SessionOverviewContent,
	SessionOverviewTokenCandidates,
} from '@kingdom-builder/protocol/session';

const createDefaultOverviewContent = (): OverviewContentTemplate => ({
	hero: {
		badgeIcon: '',
		badgeLabel: '',
		title: '',
		intro: '',
		paragraph: '',
		tokens: {},
	},
	sections: [],
	tokens: {},
});

const cloneOverviewHero = (
	hero: SessionOverviewContent['hero'],
): OverviewContentTemplate['hero'] => ({
	badgeIcon: hero.badgeIcon ?? '',
	badgeLabel: hero.badgeLabel ?? '',
	title: hero.title ?? '',
	intro: hero.intro ?? '',
	paragraph: hero.paragraph ?? '',
	tokens: { ...hero.tokens },
});

const cloneOverviewTokens = (
	tokens?: SessionOverviewTokenCandidates,
): OverviewTokenCandidates => {
	if (!tokens) {
		return {};
	}
	const clone: OverviewTokenCandidates = {};
	for (const [category, record] of Object.entries(tokens)) {
		if (!record) {
			continue;
		}
		const entries: Record<string, string[]> = {};
		for (const [token, candidates] of Object.entries(record)) {
			entries[token] = Array.isArray(candidates) ? [...candidates] : [];
		}
		clone[category as keyof OverviewTokenCandidates] = entries;
	}
	return clone;
};

const cloneOverviewSection = (
	section: SessionOverviewContent['sections'][number],
): OverviewContentTemplate['sections'][number] => {
	if (section.kind === 'paragraph') {
		const clone: OverviewContentTemplate['sections'][number] = {
			kind: 'paragraph',
			id: section.id,
			icon: section.icon,
			title: section.title,
			paragraphs: [...section.paragraphs],
		};
		if (section.span) {
			clone.span = true;
		}
		return clone;
	}
	const items = section.items.map((item) => {
		const entry: OverviewListTemplate['items'][number] = {
			label: item.label,
			body: [...item.body],
		};
		if (item.icon !== undefined) {
			entry.icon = item.icon;
		}
		return entry;
	});
	const clone: OverviewContentTemplate['sections'][number] = {
		kind: 'list',
		id: section.id,
		icon: section.icon,
		title: section.title,
		items,
	};
	if (section.span) {
		clone.span = true;
	}
	return clone;
};

export const createOverviewContentFromMetadata = (
	overview?: SessionOverviewContent,
): OverviewContentTemplate => {
	if (!overview) {
		return createDefaultOverviewContent();
	}
	const hero = cloneOverviewHero(overview.hero);
	const sections = overview.sections.map((section) =>
		cloneOverviewSection(section),
	);
	const tokens = cloneOverviewTokens(overview.tokens);
	return {
		hero,
		sections,
		tokens,
	};
};
