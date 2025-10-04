import type { ReactNode } from 'react';
import {
	ACTIONS as actionInfo,
	LAND_INFO,
	SLOT_INFO,
	RESOURCES,
	PHASES,
	POPULATION_ROLES,
	STATS,
	type OverviewTokenCategoryName,
} from '@kingdom-builder/contents';
import type { OverviewIconSet } from './sectionsData';

export type TokenCandidateInput = string | ReadonlyArray<string>;
type OverviewTokenCategoryOverrides = Record<string, TokenCandidateInput>;
type OverviewTokenCategoryConfig = Record<string, string[]>;
type OverviewTokenConfigResolved = Record<
	OverviewTokenCategoryName,
	OverviewTokenCategoryConfig
>;
const actionRegistry = actionInfo as unknown as {
	keys(): string[];
	has(id: string): boolean;
	get(id: string): { icon?: ReactNode };
};
const STATIC_ICON_INFO: Record<string, { icon?: ReactNode }> = {
	land: LAND_INFO,
	slot: SLOT_INFO,
};
const PHASE_ICON_LOOKUP = new Map(
	PHASES.map((phase) => [phase.id, phase.icon] as const),
);

const resolveResourceIcon = (candidates: string[]) =>
	resolveFromRecord(RESOURCES, candidates);
const resolveStatIcon = (candidates: string[]) =>
	resolveFromRecord(STATS, candidates);
const resolvePopulationIcon = (candidates: string[]) =>
	resolveFromRecord(POPULATION_ROLES, candidates);
const resolveStaticIcon = (candidates: string[]) =>
	resolveFromRecord(STATIC_ICON_INFO, candidates);

const CATEGORY_CONFIG = [
	{
		name: 'actions',
		keys: () => actionRegistry.keys(),
		resolve: (candidates: string[]) =>
			resolveByCandidates(candidates, (id) => {
				if (!actionRegistry.has(id)) {
					return undefined;
				}
				return actionRegistry.get(id)?.icon;
			}),
	},
	{
		name: 'phases',
		keys: () => PHASES.map((phase) => phase.id),
		resolve: (candidates: string[]) =>
			resolveByCandidates(candidates, (id) => PHASE_ICON_LOOKUP.get(id)),
	},
	{
		name: 'resources',
		keys: () => Object.keys(RESOURCES),
		resolve: resolveResourceIcon,
	},
	{
		name: 'stats',
		keys: () => Object.keys(STATS),
		resolve: resolveStatIcon,
	},
	{
		name: 'population',
		keys: () => Object.keys(POPULATION_ROLES),
		resolve: resolvePopulationIcon,
	},
	{
		name: 'static',
		keys: () => Object.keys(STATIC_ICON_INFO),
		resolve: resolveStaticIcon,
	},
] satisfies ReadonlyArray<{
	name: OverviewTokenCategoryName;
	keys: () => string[];
	resolve: (candidates: string[]) => ReactNode | undefined;
}>;

const hasOwn = (target: object | undefined, key: PropertyKey) =>
	target !== undefined && Object.prototype.hasOwnProperty.call(target, key);

function isStringArray(
	value: TokenCandidateInput,
): value is ReadonlyArray<string> {
	return Array.isArray(value);
}

function normalizeCandidates(input?: TokenCandidateInput): string[] {
	if (!input) {
		return [];
	}
	if (isStringArray(input)) {
		return [...input];
	}
	return [input];
}

function mergeTokenCategory(
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

function createDefaultTokenConfig(): OverviewTokenConfigResolved {
	const result = {} as OverviewTokenConfigResolved;

	const addDefaultCandidate = (
		acc: OverviewTokenCategoryConfig,
		key: string,
	) => {
		acc[key] = [key];
		return acc;
	};

	for (const { name, keys } of CATEGORY_CONFIG) {
		const entries = keys();
		result[name] = entries.reduce<OverviewTokenCategoryConfig>(
			addDefaultCandidate,
			{},
		);
	}

	return result;
}

function mergeTokenConfig(
	overrides?: OverviewTokenConfig,
): OverviewTokenConfigResolved {
	const defaults = createDefaultTokenConfig();
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

function resolveByCandidates<T>(
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

function resolveFromRecord<T extends Record<string, { icon?: ReactNode }>>(
	record: T,
	candidates: string[],
) {
	return resolveByCandidates(candidates, (id) => {
		if (Object.prototype.hasOwnProperty.call(record, id)) {
			const key = id as keyof T;
			return record[key]?.icon;
		}
		return undefined;
	});
}

export function buildOverviewIconSet(
	overrides?: OverviewTokenConfig,
): OverviewIconSet {
	const config = mergeTokenConfig(overrides);
	const icons: OverviewIconSet = {};

	for (const { name, resolve } of CATEGORY_CONFIG) {
		const overrideSource = overrides?.[name];

		for (const [tokenKey, candidates] of Object.entries(config[name])) {
			const hasOverride = hasOwn(overrideSource, tokenKey);
			const hasExistingValue =
				hasOwn(icons, tokenKey) &&
				icons[tokenKey] !== undefined &&
				icons[tokenKey] !== null;

			if (hasExistingValue && !hasOverride) {
				continue;
			}

			const resolvedIcon = resolve(candidates);

			if (resolvedIcon !== undefined) {
				icons[tokenKey] = resolvedIcon;
			} else if (!hasExistingValue) {
				icons[tokenKey] = undefined;
			}
		}
	}

	return icons;
}
