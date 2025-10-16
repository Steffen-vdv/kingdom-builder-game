import type {
	OverviewContentTemplate,
	OverviewTokenCandidates,
	SessionOverviewContent,
	SessionOverviewSection,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';

export const EMPTY_OVERVIEW_CONTENT: OverviewContentTemplate = {
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
};

function cloneParagraphSection(
	section: SessionOverviewSection & { kind: 'paragraph' },
): OverviewContentTemplate['sections'][number] {
	return {
		kind: 'paragraph',
		id: section.id,
		icon: section.icon,
		title: section.title,
		span: section.span ?? false,
		paragraphs: [...section.paragraphs],
	};
}

function cloneListSection(
	section: SessionOverviewSection & { kind: 'list' },
): OverviewContentTemplate['sections'][number] {
	return {
		kind: 'list',
		id: section.id,
		icon: section.icon,
		title: section.title,
		span: section.span ?? false,
		items: section.items.map((item) => {
			const cloned = {
				label: item.label,
				body: [...item.body],
			};
			if (item.icon !== undefined) {
				return { ...cloned, icon: item.icon };
			}
			return cloned;
		}),
	};
}

function cloneOverviewSections(
	sections: SessionOverviewSection[] | undefined,
): OverviewContentTemplate['sections'] {
	if (!sections || sections.length === 0) {
		return [];
	}
	return sections.map((section) => {
		if (section.kind === 'paragraph') {
			return cloneParagraphSection(section);
		}
		return cloneListSection(section);
	});
}

function cloneOverviewTokens(
	tokens: SessionOverviewContent['tokens'] | undefined,
): OverviewTokenCandidates {
	const cloned: OverviewTokenCandidates = {};
	if (!tokens) {
		return cloned;
	}
	for (const [category, record] of Object.entries(tokens)) {
		if (!record) {
			continue;
		}
		const entries: Record<string, string[]> = {};
		for (const [token, candidates] of Object.entries(record)) {
			entries[token] = Array.isArray(candidates) ? [...candidates] : [];
		}
		cloned[category as keyof OverviewTokenCandidates] = entries;
	}
	return cloned;
}

export function resolveOverviewContent(
	snapshot: SessionSnapshotMetadata,
): OverviewContentTemplate {
	const { overview } = snapshot;
	if (!overview) {
		return EMPTY_OVERVIEW_CONTENT;
	}
	const hero = {
		badgeIcon: overview.hero.badgeIcon ?? '',
		badgeLabel: overview.hero.badgeLabel ?? '',
		title: overview.hero.title ?? '',
		intro: overview.hero.intro ?? '',
		paragraph: overview.hero.paragraph ?? '',
		tokens: { ...overview.hero.tokens },
	};
	const sections = cloneOverviewSections(overview.sections);
	const tokens = cloneOverviewTokens(overview.tokens);
	return { hero, sections, tokens };
}
