import type { ReactNode } from 'react';
import {
	ACTIONS as actionInfo,
	LAND_INFO,
	SLOT_INFO,
	RESOURCES,
	Resource,
	PHASES,
	POPULATION_ROLES,
	PopulationRole,
	STATS,
	Stat,
} from '@kingdom-builder/contents';
import type { OverviewIconSet } from './sectionsData';

type TokenCandidateInput = string | ReadonlyArray<string>;

type OverviewTokenCategory<TKeys extends string> = Partial<
	Record<TKeys, TokenCandidateInput>
>;

type TokenCategoryKeys = {
	actions: 'expand' | 'build' | 'attack' | 'develop' | 'raisePop';
	phases: 'growth' | 'upkeep' | 'main';
	resources: 'gold' | 'ap' | 'happiness' | 'castle';
	stats: 'army' | 'fort';
	population: 'council' | 'legion' | 'fortifier' | 'citizen';
};

type OverviewTokenConfigResolved = {
	[K in keyof TokenCategoryKeys]: Record<TokenCategoryKeys[K], string[]>;
};

const DEFAULT_TOKEN_CONFIG: OverviewTokenConfigResolved = {
	actions: {
		expand: ['expand'],
		build: ['build'],
		attack: ['army_attack', 'attack'],
		develop: ['develop'],
		raisePop: ['raise_pop'],
	},
	phases: {
		growth: ['growth'],
		upkeep: ['upkeep'],
		main: ['main'],
	},
	resources: {
		gold: [Resource.gold],
		ap: [Resource.ap],
		happiness: [Resource.happiness],
		castle: [Resource.castleHP],
	},
	stats: {
		army: [Stat.armyStrength],
		fort: [Stat.fortificationStrength],
	},
	population: {
		council: [PopulationRole.Council],
		legion: [PopulationRole.Legion],
		fortifier: [PopulationRole.Fortifier],
		citizen: [PopulationRole.Citizen],
	},
};

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

function mergeTokenCategory<TKeys extends string>(
	defaults: Record<TKeys, string[]>,
	overrides?: OverviewTokenCategory<TKeys>,
): Record<TKeys, string[]> {
	const result: Record<TKeys, string[]> = {} as Record<TKeys, string[]>;
	for (const key of Object.keys(defaults) as TKeys[]) {
		const overrideCandidates = normalizeCandidates(overrides?.[key]);
		const merged = overrideCandidates.slice();
		for (const candidate of defaults[key]) {
			if (!merged.includes(candidate)) {
				merged.push(candidate);
			}
		}
		result[key] = merged;
	}
	return result;
}

export interface OverviewTokenConfig {
	actions?: OverviewTokenCategory<TokenCategoryKeys['actions']>;
	phases?: OverviewTokenCategory<TokenCategoryKeys['phases']>;
	resources?: OverviewTokenCategory<TokenCategoryKeys['resources']>;
	stats?: OverviewTokenCategory<TokenCategoryKeys['stats']>;
	population?: OverviewTokenCategory<TokenCategoryKeys['population']>;
}

function mergeTokenConfig(
	overrides?: OverviewTokenConfig,
): OverviewTokenConfigResolved {
	return {
		// prettier-ignore
		actions: mergeTokenCategory(
                        DEFAULT_TOKEN_CONFIG.actions,
                        overrides?.actions,
                ),
		// prettier-ignore
		phases: mergeTokenCategory(
                        DEFAULT_TOKEN_CONFIG.phases,
                        overrides?.phases,
                ),
		// prettier-ignore
		resources: mergeTokenCategory(
                        DEFAULT_TOKEN_CONFIG.resources,
                        overrides?.resources,
                ),
		// prettier-ignore
		stats: mergeTokenCategory(
                        DEFAULT_TOKEN_CONFIG.stats,
                        overrides?.stats,
                ),
		// prettier-ignore
		population: mergeTokenCategory(
                        DEFAULT_TOKEN_CONFIG.population,
                        overrides?.population,
                ),
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

function resolveActionIcon(candidates: string[]) {
	const registry = actionInfo as unknown as {
		has(id: string): boolean;
		get(id: string): { icon?: ReactNode };
	};
	return resolveByCandidates(candidates, (id) => {
		if (!registry.has(id)) {
			return undefined;
		}
		return registry.get(id)?.icon;
	});
}

function resolvePhaseIcon(candidates: string[]) {
	return resolveByCandidates(
		candidates,
		(id) => PHASES.find((phase) => phase.id === id)?.icon,
	);
}

function resolveResourceIcon(candidates: string[]) {
	return resolveByCandidates(candidates, (id) => {
		if (Object.prototype.hasOwnProperty.call(RESOURCES, id)) {
			const key = id as keyof typeof RESOURCES;
			return RESOURCES[key]?.icon;
		}
		return undefined;
	});
}

function resolveStatIcon(candidates: string[]) {
	return resolveByCandidates(candidates, (id) => {
		if (Object.prototype.hasOwnProperty.call(STATS, id)) {
			const key = id as keyof typeof STATS;
			return STATS[key]?.icon;
		}
		return undefined;
	});
}

function resolvePopulationIcon(candidates: string[]) {
	return resolveByCandidates(candidates, (id) => {
		if (Object.prototype.hasOwnProperty.call(POPULATION_ROLES, id)) {
			const key = id as keyof typeof POPULATION_ROLES;
			return POPULATION_ROLES[key]?.icon;
		}
		return undefined;
	});
}

export function buildOverviewIconSet(
	overrides?: OverviewTokenConfig,
): OverviewIconSet {
	const config = mergeTokenConfig(overrides);
	return {
		expand: resolveActionIcon(config.actions.expand),
		build: resolveActionIcon(config.actions.build),
		attack: resolveActionIcon(config.actions.attack),
		develop: resolveActionIcon(config.actions.develop),
		raisePop: resolveActionIcon(config.actions.raisePop),
		growth: resolvePhaseIcon(config.phases.growth),
		upkeep: resolvePhaseIcon(config.phases.upkeep),
		main: resolvePhaseIcon(config.phases.main),
		land: LAND_INFO.icon,
		slot: SLOT_INFO.icon,
		gold: resolveResourceIcon(config.resources.gold),
		ap: resolveResourceIcon(config.resources.ap),
		happiness: resolveResourceIcon(config.resources.happiness),
		castle: resolveResourceIcon(config.resources.castle),
		army: resolveStatIcon(config.stats.army),
		fort: resolveStatIcon(config.stats.fort),
		council: resolvePopulationIcon(config.population.council),
		legion: resolvePopulationIcon(config.population.legion),
		fortifier: resolvePopulationIcon(config.population.fortifier),
		citizen: resolvePopulationIcon(config.population.citizen),
	} satisfies OverviewIconSet;
}
