import type { ReactNode } from 'react';
import type {
	SessionOverviewSectionDescriptor,
	SessionOverviewTokenCandidates,
} from '@kingdom-builder/protocol/session';
import type { OverviewSectionDef } from './OverviewLayout';
import {
	buildOverviewIconSet,
	type OverviewTokenConfig,
	type OverviewTokenSources,
} from './overviewTokens';

export type OverviewIconSet = Record<string, ReactNode | undefined>;

export type OverviewContentSection = SessionOverviewSectionDescriptor;

function spanProps(span?: boolean) {
	return span === undefined ? {} : { span };
}

export function createOverviewSections(
	tokenCandidates: SessionOverviewTokenCandidates,
	overrides: OverviewTokenConfig | undefined,
	content: OverviewContentSection[],
	tokenSources: OverviewTokenSources,
): { sections: OverviewSectionDef[]; tokens: OverviewIconSet } {
	const icons = buildOverviewIconSet(tokenSources, tokenCandidates, overrides);

	const sections = content.map((section) => {
		if (section.kind === 'paragraph') {
			return {
				kind: 'paragraph',
				id: section.id,
				icon: icons[section.icon] ?? null,
				title: section.title,
				paragraphs: section.paragraphs,
				...spanProps(section.span),
			} satisfies OverviewSectionDef;
		}

		return {
			kind: 'list',
			id: section.id,
			icon: icons[section.icon] ?? null,
			title: section.title,
			items: section.items.map((item) => ({
				icon: item.icon ? (icons[item.icon] ?? null) : undefined,
				label: item.label,
				body: item.body,
			})),
			...spanProps(section.span),
		} satisfies OverviewSectionDef;
	});

	return { sections, tokens: icons };
}
