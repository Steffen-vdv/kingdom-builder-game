import type { ReactNode } from 'react';
import type {
	OverviewTokenCandidatesSource,
	OverviewContentSection,
} from './defaultContent';
export type { OverviewContentSection } from './defaultContent';
import type { OverviewSectionDef } from './OverviewLayout';
import {
	buildOverviewIconSet,
	type OverviewTokenConfig,
	type TokenCandidateInput,
} from './overviewTokens';
import {
	normalizeCandidates,
	type OverviewTokenCategoryName,
	type OverviewTokenCategoryResolver,
} from './overviewTokenUtils';

export type OverviewIconSet = Record<string, ReactNode | undefined>;

function spanProps(span?: boolean) {
	return span === undefined ? {} : { span };
}

function mergeTokenSources(
	base: OverviewTokenCandidatesSource,
	overrides?: OverviewTokenConfig,
): OverviewTokenConfig {
	const merged: OverviewTokenConfig = {};
	const baseCategories = Object.keys(base) as OverviewTokenCategoryName[];
	const overrideCategories = overrides
		? (Object.keys(overrides) as OverviewTokenCategoryName[])
		: [];
	const categories = new Set<OverviewTokenCategoryName>([
		...baseCategories,
		...overrideCategories,
	]);

	for (const category of categories) {
		const baseEntries: Record<string, string[]> = base[category] ?? {};
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
	tokenCandidates: OverviewTokenCandidatesSource,
	overrides: OverviewTokenConfig | undefined,
	content: OverviewContentSection[],
	categories: ReadonlyArray<OverviewTokenCategoryResolver>,
): { sections: OverviewSectionDef[]; tokens: OverviewIconSet } {
	const mergedTokenConfig = mergeTokenSources(tokenCandidates, overrides);
	const icons = buildOverviewIconSet(mergedTokenConfig, categories);

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
