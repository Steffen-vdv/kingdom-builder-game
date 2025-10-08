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
	type PhaseId,
} from '@kingdom-builder/contents';

export type TokenCandidateInput = string | ReadonlyArray<string>;

type OverviewTokenCategoryOverrides = Record<string, TokenCandidateInput>;
type OverviewTokenCategoryConfig = Record<string, string[]>;
type OverviewTokenConfigResolved = Record<
	OverviewTokenCategoryName,
	OverviewTokenCategoryConfig
>;

type ActionRegistry = {
	keys(): string[];
	has(id: string): boolean;
	get(id: string): { icon?: ReactNode };
};

const actionRegistry = actionInfo as unknown as ActionRegistry;

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

export const CATEGORY_CONFIG = [
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
			resolveByCandidates(candidates, (id) =>
				PHASE_ICON_LOOKUP.get(id as PhaseId),
			),
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

export function createDefaultTokenConfig(): OverviewTokenConfigResolved {
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

export function mergeTokenConfig(
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
