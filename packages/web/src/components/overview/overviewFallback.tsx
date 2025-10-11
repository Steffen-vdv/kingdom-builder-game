import type { ReactNode } from 'react';
import type { ActionConfig, PopulationConfig } from '@kingdom-builder/protocol';
import {
	ACTIONS,
	LAND_INFO,
	POPULATIONS,
	PHASES,
	RESOURCES,
	SLOT_INFO,
	STATS,
	type OverviewTokenCandidates,
	type OverviewTokenCategoryName,
} from '@kingdom-builder/contents';
import type { OverviewSectionDef } from './OverviewLayout';
import type { OverviewContentSection } from './sectionsData';
import type { OverviewTokenConfig } from './overviewTokens';
import { normalizeCandidates } from './overviewTokenUtils';

type OverviewTokenRecord = Record<string, ReactNode>;

type TokenDescriptor = {
	icon?: ReactNode;
	label?: string;
};

type TokenDescriptorRecord = Record<string, TokenDescriptor>;

const createDescriptor = (
	icon?: ReactNode,
	label?: string,
): TokenDescriptor => {
	const descriptor: TokenDescriptor = {};
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (label !== undefined) {
		descriptor.label = label;
	}
	return descriptor;
};

const createRegistryDescriptorRecord = <TDefinition extends { icon?: unknown }>(
	entries: ReadonlyArray<readonly [string, TDefinition]>,
	labelFor: (definition: TDefinition, id: string) => string | undefined,
): TokenDescriptorRecord => {
	const record: TokenDescriptorRecord = {};
	for (const [id, definition] of entries) {
		record[id] = createDescriptor(
			definition.icon as ReactNode | undefined,
			labelFor(definition, id),
		);
	}
	return record;
};

const ACTION_DESCRIPTOR_RECORD = createRegistryDescriptorRecord<ActionConfig>(
	ACTIONS.entries(),
	(definition) => definition.name,
);

const PHASE_DESCRIPTOR_RECORD: TokenDescriptorRecord = (() => {
	const record: TokenDescriptorRecord = {};
	for (const phase of PHASES) {
		record[phase.id] = createDescriptor(phase.icon, phase.label);
	}
	return record;
})();

const RESOURCE_DESCRIPTOR_RECORD: TokenDescriptorRecord = Object.fromEntries(
	Object.entries(RESOURCES).map(([id, definition]) => [
		id,
		createDescriptor(definition.icon, definition.label),
	]),
) as TokenDescriptorRecord;

const STAT_DESCRIPTOR_RECORD: TokenDescriptorRecord = Object.fromEntries(
	Object.entries(STATS).map(([id, definition]) => [
		id,
		createDescriptor(definition.icon, definition.label),
	]),
) as TokenDescriptorRecord;

const POPULATION_DESCRIPTOR_RECORD =
	createRegistryDescriptorRecord<PopulationConfig>(
		POPULATIONS.entries(),
		(definition) => definition.name,
	);

const STATIC_DESCRIPTOR_RECORD: TokenDescriptorRecord = {
	land: createDescriptor(LAND_INFO.icon, LAND_INFO.label),
	slot: createDescriptor(SLOT_INFO.icon, SLOT_INFO.label),
};

const DESCRIPTORS_BY_CATEGORY: Record<
	OverviewTokenCategoryName,
	TokenDescriptorRecord
> = Object.freeze({
	actions: ACTION_DESCRIPTOR_RECORD,
	phases: PHASE_DESCRIPTOR_RECORD,
	resources: RESOURCE_DESCRIPTOR_RECORD,
	stats: STAT_DESCRIPTOR_RECORD,
	population: POPULATION_DESCRIPTOR_RECORD,
	static: STATIC_DESCRIPTOR_RECORD,
});

function mergeFallbackTokenCandidates(
	tokens: OverviewTokenCandidates,
	overrides: OverviewTokenConfig | undefined,
): Partial<Record<OverviewTokenCategoryName, Record<string, string[]>>> {
	const categories = new Set<OverviewTokenCategoryName>([
		...(Object.keys(tokens ?? {}) as OverviewTokenCategoryName[]),
		...(overrides
			? (Object.keys(overrides) as OverviewTokenCategoryName[])
			: []),
	]);
	const merged: Partial<
		Record<OverviewTokenCategoryName, Record<string, string[]>>
	> = {};
	for (const category of categories) {
		const baseEntries = tokens?.[category] ?? {};
		const overrideEntries = overrides?.[category];
		const tokenKeys = new Set<string>([
			...Object.keys(baseEntries),
			...(overrideEntries ? Object.keys(overrideEntries) : []),
		]);
		const categoryResult: Record<string, string[]> = {};
		for (const tokenKey of tokenKeys) {
			const combined: string[] = [];
			const addCandidate = (candidate: string) => {
				if (!combined.includes(candidate)) {
					combined.push(candidate);
				}
			};
			const overrideCandidates = normalizeCandidates(
				overrideEntries?.[tokenKey],
			);
			for (const candidate of overrideCandidates) {
				addCandidate(candidate);
			}
			for (const candidate of baseEntries[tokenKey] ?? []) {
				addCandidate(candidate);
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

function resolveTokenDescriptor(
	category: OverviewTokenCategoryName,
	candidates: ReadonlyArray<string>,
): TokenDescriptor | undefined {
	const descriptors = DESCRIPTORS_BY_CATEGORY[category];
	if (!descriptors) {
		return undefined;
	}
	for (const candidate of candidates) {
		const descriptor = descriptors[candidate];
		if (descriptor && (descriptor.icon !== undefined || descriptor.label)) {
			return descriptor;
		}
	}
	return undefined;
}

export function createOverviewFallbackContent(
	sections: OverviewContentSection[],
	tokenCandidates: OverviewTokenCandidates,
	overrides: OverviewTokenConfig | undefined,
): { sections: OverviewSectionDef[]; tokens: OverviewTokenRecord } {
	const mergedCandidates = mergeFallbackTokenCandidates(
		tokenCandidates,
		overrides,
	);
	const tokens: OverviewTokenRecord = {};
	const descriptorByToken: Record<string, TokenDescriptor | undefined> = {};
	for (const [category, entries] of Object.entries(mergedCandidates) as [
		OverviewTokenCategoryName,
		Record<string, string[]>,
	][]) {
		for (const [tokenKey, candidates] of Object.entries(entries)) {
			const descriptor = resolveTokenDescriptor(category, candidates);
			descriptorByToken[tokenKey] = descriptor;
			if (descriptor?.icon !== undefined) {
				tokens[tokenKey] = descriptor.icon;
				continue;
			}
			if (descriptor?.label !== undefined) {
				tokens[tokenKey] = <strong>{descriptor.label}</strong>;
				continue;
			}
			if (!Object.prototype.hasOwnProperty.call(tokens, tokenKey)) {
				tokens[tokenKey] = <strong>{tokenKey}</strong>;
			}
		}
	}
	const resolveIcon = (tokenKey: string | undefined): ReactNode | null => {
		if (!tokenKey) {
			return null;
		}
		const descriptor = descriptorByToken[tokenKey];
		if (!descriptor || descriptor.icon === undefined) {
			return null;
		}
		return descriptor.icon;
	};
	const renderedSections = sections.map((section) => {
		if (section.kind === 'paragraph') {
			return {
				kind: 'paragraph',
				id: section.id,
				icon: resolveIcon(section.icon),
				title: section.title,
				paragraphs: section.paragraphs,
				span: section.span ?? false,
			} satisfies OverviewSectionDef;
		}
		return {
			kind: 'list',
			id: section.id,
			icon: resolveIcon(section.icon),
			title: section.title,
			items: section.items.map((item) => ({
				icon: item.icon ? resolveIcon(item.icon) : undefined,
				label: item.label,
				body: item.body,
			})),
			span: section.span ?? false,
		} satisfies OverviewSectionDef;
	});
	return { sections: renderedSections, tokens };
}

export type { OverviewTokenRecord };
