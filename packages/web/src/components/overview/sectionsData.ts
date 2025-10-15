import type { ReactNode } from 'react';
import type {
	SessionOverviewSection,
	SessionOverviewTokenCandidates,
	SessionOverviewTokenCategoryName,
} from '@kingdom-builder/protocol/session';
import type { OverviewSectionDef } from './OverviewLayout';
import {
	buildOverviewIconSet,
	type OverviewTokenConfig,
	type TokenCandidateInput,
	type OverviewTokenSources,
} from './overviewTokens';
import { normalizeCandidates } from './overviewTokenUtils';

export type OverviewIconSet = Record<string, ReactNode | undefined>;

export type OverviewContentSection = SessionOverviewSection;

function spanProps(span?: boolean) {
	return span === undefined ? {} : { span };
}

function mergeTokenSources(
	base: SessionOverviewTokenCandidates,
	overrides?: OverviewTokenConfig,
): OverviewTokenConfig {
	const merged: OverviewTokenConfig = {};
	const categories = new Set<SessionOverviewTokenCategoryName>([
		...(Object.keys(base ?? {}) as SessionOverviewTokenCategoryName[]),
		...(overrides
			? (Object.keys(overrides) as SessionOverviewTokenCategoryName[])
			: []),
	]);

	for (const category of categories) {
		const baseEntries = base?.[category] ?? {};
		const overrideEntries = overrides?.[category];
		const categoryResult: Record<string, TokenCandidateInput> = {};
		const tokens = new Set<string>([
			...Object.keys(baseEntries),
			...(overrideEntries ? Object.keys(overrideEntries) : []),
		]);

		for (const tokenKey of tokens) {
			const baseCandidates = baseEntries[tokenKey] ?? [];
			const overrideCandidates = normalizeCandidates(
				overrideEntries?.[tokenKey],
			);
			const combined: string[] = [];

			for (const candidate of overrideCandidates) {
				if (!combined.includes(candidate)) {
					combined.push(candidate);
				}
			}

			for (const candidate of baseCandidates) {
				if (!combined.includes(candidate)) {
					combined.push(candidate);
				}
			}

			if (combined.length > 0) {
				categoryResult[tokenKey] = combined;
			}
		}

		if (Object.keys(categoryResult).length > 0) {
			merged[category] = categoryResult;
		}
	}

	return merged;
}

export function createOverviewSections(
	tokenCandidates: SessionOverviewTokenCandidates,
	overrides: OverviewTokenConfig | undefined,
	content: ReadonlyArray<SessionOverviewSection>,
	tokenSources: OverviewTokenSources,
): { sections: OverviewSectionDef[]; tokens: OverviewIconSet } {
	const mergedTokenConfig = mergeTokenSources(tokenCandidates, overrides);
	const icons = buildOverviewIconSet(tokenSources, mergedTokenConfig);

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
