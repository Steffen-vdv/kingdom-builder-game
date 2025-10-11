import type { ReactNode } from 'react';
import type { RegistryMetadataContextValue } from '../../contexts/RegistryMetadataContext';

export type OverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

export type TokenCandidateInput = string | ReadonlyArray<string>;

type OverviewTokenCategoryOverrides = Record<string, TokenCandidateInput>;
type OverviewTokenCategoryConfig = Record<string, string[]>;
type OverviewTokenConfigResolved = Record<
	OverviewTokenCategoryName,
	OverviewTokenCategoryConfig
>;

export interface OverviewTokenCategoryResolver {
	readonly name: OverviewTokenCategoryName;
	readonly keys: () => ReadonlyArray<string>;
	readonly resolve: (candidates: string[]) => ReactNode | undefined;
}

const STATIC_TOKEN_KEYS: ReadonlyArray<string> = ['land', 'slot'];

const iconFromDescriptor = (descriptor: { icon?: ReactNode } | undefined) =>
	descriptor?.icon;

const createDescriptorIconResolver =
	(selector: { select(id: string): { icon?: ReactNode } }) => (id: string) =>
		iconFromDescriptor(selector.select(id));

const createStaticIconMap = (
	metadata: RegistryMetadataContextValue,
): Readonly<Record<string, ReactNode | undefined>> =>
	Object.freeze({
		land: metadata.landMetadata.select().icon,
		slot: metadata.slotMetadata.select().icon,
	});

export function createOverviewTokenCategories(
	metadata: RegistryMetadataContextValue,
): ReadonlyArray<OverviewTokenCategoryResolver> {
	const actionIcon = createDescriptorIconResolver(metadata.actionMetadata);
	const resourceIcon = createDescriptorIconResolver(metadata.resourceMetadata);
	const statIcon = createDescriptorIconResolver(metadata.statMetadata);
	const populationIcon = createDescriptorIconResolver(
		metadata.populationMetadata,
	);
	const phaseIcon = (id: string) => metadata.phaseMetadata.select(id).icon;
	const staticIconMap = createStaticIconMap(metadata);

	return [
		{
			name: 'actions',
			keys: () => metadata.actions.keys(),
			resolve: (candidates) =>
				resolveByCandidates(candidates, (candidate) => actionIcon(candidate)),
		},
		{
			name: 'phases',
			keys: () => metadata.phaseMetadata.list.map(({ id }) => id),
			resolve: (candidates) =>
				resolveByCandidates(candidates, (candidate) => phaseIcon(candidate)),
		},
		{
			name: 'resources',
			keys: () => metadata.resourceMetadata.list.map(({ id }) => id),
			resolve: (candidates) =>
				resolveByCandidates(candidates, (candidate) => resourceIcon(candidate)),
		},
		{
			name: 'stats',
			keys: () => metadata.statMetadata.list.map(({ id }) => id),
			resolve: (candidates) =>
				resolveByCandidates(candidates, (candidate) => statIcon(candidate)),
		},
		{
			name: 'population',
			keys: () => metadata.populationMetadata.list.map(({ id }) => id),
			resolve: (candidates) =>
				resolveByCandidates(candidates, (candidate) =>
					populationIcon(candidate),
				),
		},
		{
			name: 'static',
			keys: () => STATIC_TOKEN_KEYS,
			resolve: (candidates) =>
				resolveByCandidates(
					candidates,
					(candidate) => staticIconMap[candidate],
				),
		},
	];
}

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

export type OverviewTokenConfig = Partial<
	Record<OverviewTokenCategoryName, OverviewTokenCategoryOverrides>
>;

export function createDefaultTokenConfig(
	categories: ReadonlyArray<OverviewTokenCategoryResolver>,
): OverviewTokenConfigResolved {
	const result = {} as OverviewTokenConfigResolved;
	const addDefaultCandidate = (
		acc: OverviewTokenCategoryConfig,
		key: string,
	) => {
		acc[key] = [key];
		return acc;
	};

	for (const { name, keys } of categories) {
		const entries = keys();
		result[name] = entries.reduce<OverviewTokenCategoryConfig>(
			addDefaultCandidate,
			{},
		);
	}

	return result;
}

export function mergeTokenConfig(
	overrides: OverviewTokenConfig | undefined,
	categories: ReadonlyArray<OverviewTokenCategoryResolver>,
): OverviewTokenConfigResolved {
	const defaults = createDefaultTokenConfig(categories);
	const resolved = {} as OverviewTokenConfigResolved;

	for (const { name } of categories) {
		resolved[name] = mergeTokenCategory(defaults[name], overrides?.[name]);
	}

	return resolved;
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
