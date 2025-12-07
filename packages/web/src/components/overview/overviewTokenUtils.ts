import type { ReactNode } from 'react';
import type { ActionConfig } from '@kingdom-builder/protocol';
import type {
	SessionOverviewMetadata,
	SessionOverviewTokenCategoryName,
} from '@kingdom-builder/protocol/session';
import type {
	AssetMetadata,
	AssetMetadataSelector,
	DefinitionLookup,
	MetadataSelector,
	PhaseMetadata,
	RegistryMetadataDescriptor,
} from '../../contexts/RegistryMetadataContext';

export type TokenCandidateInput = string | ReadonlyArray<string>;

type OverviewTokenCategoryName = SessionOverviewTokenCategoryName;
type OverviewTokenMapShape = NonNullable<SessionOverviewMetadata['tokens']>;
type OverviewTokenCategoryOverrides = Record<string, TokenCandidateInput>;
type OverviewTokenCategoryConfig = Record<string, string[]>;
type OverviewTokenConfigResolved = Record<
	OverviewTokenCategoryName,
	OverviewTokenCategoryConfig
>;

type OverviewTokenOverrides = {
	[Category in keyof OverviewTokenMapShape]?: OverviewTokenCategoryOverrides;
};

export interface OverviewTokenSources {
	actions: DefinitionLookup<ActionConfig>;
	phases: MetadataSelector<PhaseMetadata>;
	resources: MetadataSelector<RegistryMetadataDescriptor>;
	stats: MetadataSelector<RegistryMetadataDescriptor>;
	population: MetadataSelector<RegistryMetadataDescriptor>;
	land: AssetMetadataSelector;
	slot: AssetMetadataSelector;
	landDescriptor: AssetMetadata;
	slotDescriptor: AssetMetadata;
}

interface OverviewTokenSourceArgs {
	actions: DefinitionLookup<ActionConfig>;
	phaseMetadata: MetadataSelector<PhaseMetadata>;
	resourceMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	statMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	landMetadata: AssetMetadataSelector;
	slotMetadata: AssetMetadataSelector;
}

export const createOverviewTokenSources = ({
	actions,
	phaseMetadata,
	resourceMetadata,
	statMetadata,
	landMetadata,
	slotMetadata,
}: OverviewTokenSourceArgs): OverviewTokenSources => {
	const landDescriptor = landMetadata.select();
	const slotDescriptor = slotMetadata.select();
	return {
		actions,
		phases: phaseMetadata,
		resources: resourceMetadata,
		stats: statMetadata,
		// Under ResourceV2, population resources are part of unified resources
		population: resourceMetadata,
		land: landMetadata,
		slot: slotMetadata,
		landDescriptor,
		slotDescriptor,
	};
};

type OverviewTokenCategoryDescriptor = {
	name: OverviewTokenCategoryName;
	keys: () => string[];
	resolve: (candidates: string[]) => ReactNode | undefined;
};

const toList = (ids: Iterable<string>): string[] => Array.from(ids);

const resolveDescriptorIcon = (
	selector: MetadataSelector<RegistryMetadataDescriptor>,
	candidates: string[],
) =>
	resolveByCandidates(
		candidates,
		(candidate) => selector.select(candidate).icon,
	);

const resolvePhaseIcon = (
	selector: MetadataSelector<PhaseMetadata>,
	candidates: string[],
) =>
	resolveByCandidates(
		candidates,
		(candidate) => selector.select(candidate).icon,
	);

const resolveStaticIcon = (
	record: Record<string, { icon?: ReactNode }>,
	candidates: string[],
) => resolveFromRecord(record, candidates);

const createStaticIconRecord = (
	land: AssetMetadata,
	slot: AssetMetadata,
): Record<string, { icon?: ReactNode }> => {
	const record: Record<string, { icon?: ReactNode }> = {};
	record[land.id] = { icon: land.icon };
	record[slot.id] = { icon: slot.icon };
	return record;
};

const createCategoryConfig = (
	sources: OverviewTokenSources,
): ReadonlyArray<OverviewTokenCategoryDescriptor> => {
	const staticRecord = createStaticIconRecord(
		sources.landDescriptor,
		sources.slotDescriptor,
	);
	return [
		{
			name: 'actions',
			keys: () => toList(sources.actions.keys()),
			resolve: (candidates: string[]) =>
				resolveByCandidates(
					candidates,
					(candidate) =>
						sources.actions.get(candidate)?.icon as ReactNode | undefined,
				),
		},
		{
			name: 'phases',
			keys: () => sources.phases.list.map((phase) => phase.id),
			resolve: (candidates: string[]) =>
				resolvePhaseIcon(sources.phases, candidates),
		},
		{
			name: 'resources',
			keys: () => sources.resources.list.map((descriptor) => descriptor.id),
			resolve: (candidates: string[]) =>
				resolveDescriptorIcon(sources.resources, candidates),
		},
		{
			name: 'stats',
			keys: () => sources.stats.list.map((descriptor) => descriptor.id),
			resolve: (candidates: string[]) =>
				resolveDescriptorIcon(sources.stats, candidates),
		},
		{
			name: 'population',
			keys: () => sources.population.list.map((descriptor) => descriptor.id),
			resolve: (candidates: string[]) =>
				resolveDescriptorIcon(sources.population, candidates),
		},
		{
			name: 'static',
			keys: () => Object.keys(staticRecord),
			resolve: (candidates: string[]) =>
				resolveStaticIcon(staticRecord, candidates),
		},
	];
};

export const hasOwn = (target: object | undefined, key: PropertyKey) =>
	target !== undefined && Object.prototype.hasOwnProperty.call(target, key);

export function isStringArray(
	value: TokenCandidateInput,
): value is ReadonlyArray<string> {
	return Array.isArray(value);
}

export function normalizeCandidates(input?: TokenCandidateInput): string[] {
	if (!input) {
		return [];
	}
	if (isStringArray(input)) {
		return [...input];
	}
	return [input];
}

export function mergeTokenCategory(
	defaults: OverviewTokenCategoryConfig,
	overrides?: OverviewTokenCategoryOverrides,
): OverviewTokenCategoryConfig {
	const result: OverviewTokenCategoryConfig = {};
	const keys = new Set([
		...Object.keys(defaults),
		...(overrides ? Object.keys(overrides) : []),
	]);

	for (const key of keys) {
		const defaultCandidates = defaults[key] ?? [];
		const overrideCandidates = normalizeCandidates(overrides?.[key]);
		const merged: string[] = [];

		for (const candidate of overrideCandidates) {
			if (!merged.includes(candidate)) {
				merged.push(candidate);
			}
		}

		for (const candidate of defaultCandidates) {
			if (!merged.includes(candidate)) {
				merged.push(candidate);
			}
		}

		result[key] = merged;
	}

	return result;
}

export type OverviewTokenConfig = OverviewTokenOverrides;

export function createDefaultTokenConfig(
	sources: OverviewTokenSources,
): OverviewTokenConfigResolved {
	const result = {} as OverviewTokenConfigResolved;

	const addDefaultCandidate = (
		acc: OverviewTokenCategoryConfig,
		key: string,
	) => {
		acc[key] = [key];
		return acc;
	};

	for (const { name, keys } of createCategoryConfig(sources)) {
		const entries = keys();
		result[name] = entries.reduce<OverviewTokenCategoryConfig>(
			addDefaultCandidate,
			{},
		);
	}

	return result;
}

export function mergeTokenConfig(
	sources: OverviewTokenSources,
	overrides?: OverviewTokenConfig,
): OverviewTokenConfigResolved {
	const defaults = createDefaultTokenConfig(sources);
	const actions = mergeTokenCategory(defaults.actions, overrides?.actions);
	const phases = mergeTokenCategory(defaults.phases, overrides?.phases);
	const resources = mergeTokenCategory(
		defaults.resources,
		overrides?.resources,
	);
	const stats = mergeTokenCategory(defaults.stats, overrides?.stats);
	const population = mergeTokenCategory(
		defaults.population,
		overrides?.population,
	);
	const staticIcons = mergeTokenCategory(defaults.static, overrides?.static);

	return {
		actions,
		phases,
		resources,
		stats,
		population,
		static: staticIcons,
	};
}

export function resolveByCandidates<T>(
	candidates: string[],
	resolver: (candidate: string) => T | undefined,
): T | undefined {
	for (const candidate of candidates) {
		const resolved = resolver(candidate);
		if (resolved) {
			return resolved;
		}
	}
	return undefined;
}

export function resolveFromRecord<
	T extends Record<string, { icon?: ReactNode }>,
>(record: T, candidates: string[]) {
	return resolveByCandidates(candidates, (id) => {
		if (Object.prototype.hasOwnProperty.call(record, id)) {
			const key = id as keyof T;
			return record[key]?.icon;
		}
		return undefined;
	});
}

export { createCategoryConfig };
