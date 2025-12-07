import type { ResourceCategoryDefinition, ResourceV2Definition, ResourceV2GroupDefinition } from './types';
import {
	CORE_RESOURCE_DEFINITIONS,
	getHappinessResourceDefinition,
	POPULATION_GROUP_DEFINITIONS,
	POPULATION_RESOURCE_DEFINITIONS,
	RESOURCE_CATEGORY_DEFINITIONS,
	STAT_RESOURCE_DEFINITIONS,
} from './definitions';
import { createResourceCategoryRegistry, createResourceGroupRegistry, createResourceV2Registry, type ResourceCategoryRegistry, type ResourceGroupRegistry, type ResourceV2Registry } from './registry';

export interface ResourceCatalogV2 {
	readonly resources: ResourceV2Registry;
	readonly groups: ResourceGroupRegistry;
	readonly categories: ResourceCategoryRegistry;
}

let cachedCatalog: ResourceCatalogV2 | null = null;

function assembleResourceCatalogV2(): ResourceCatalogV2 {
	if (cachedCatalog) {
		return cachedCatalog;
	}

	const HAPPINESS_RESOURCE_DEFINITION = getHappinessResourceDefinition();

	const RESOURCE_DEFINITIONS_ORDERED: readonly ResourceV2Definition[] = [...CORE_RESOURCE_DEFINITIONS, HAPPINESS_RESOURCE_DEFINITION, ...STAT_RESOURCE_DEFINITIONS, ...POPULATION_RESOURCE_DEFINITIONS];
	const RESOURCE_GROUP_DEFINITIONS_ORDERED: readonly ResourceV2GroupDefinition[] = [...POPULATION_GROUP_DEFINITIONS];
	const CATEGORY_DEFINITIONS_ORDERED: readonly ResourceCategoryDefinition[] = [...RESOURCE_CATEGORY_DEFINITIONS];

	cachedCatalog = {
		resources: createResourceV2Registry(RESOURCE_DEFINITIONS_ORDERED),
		groups: createResourceGroupRegistry(RESOURCE_GROUP_DEFINITIONS_ORDERED),
		categories: createResourceCategoryRegistry(CATEGORY_DEFINITIONS_ORDERED),
	};

	return cachedCatalog;
}

/**
 * Lazy initialization via getter functions.
 *
 * The happiness resource definition depends on effect builders that require
 * other modules to be fully loaded. Eagerly building the catalog at module
 * load time would fail due to circular dependencies in the import chain.
 */
function getResourceRegistry(): ResourceV2Registry {
	return assembleResourceCatalogV2().resources;
}

function getGroupRegistry(): ResourceGroupRegistry {
	return assembleResourceCatalogV2().groups;
}

function getCategoryRegistry(): ResourceCategoryRegistry {
	return assembleResourceCatalogV2().categories;
}

// Proxy objects defer registry construction until first property access,
// breaking circular dependencies during module initialization.
export const RESOURCE_V2_REGISTRY = new Proxy({} as ResourceV2Registry, {
	get(_, prop) {
		return getResourceRegistry()[prop as keyof ResourceV2Registry];
	},
});

export const RESOURCE_GROUP_V2_REGISTRY = new Proxy({} as ResourceGroupRegistry, {
	get(_, prop) {
		return getGroupRegistry()[prop as keyof ResourceGroupRegistry];
	},
});

export const RESOURCE_CATEGORY_V2_REGISTRY = new Proxy({} as ResourceCategoryRegistry, {
	get(_, prop) {
		return getCategoryRegistry()[prop as keyof ResourceCategoryRegistry];
	},
});

export function buildResourceCatalogV2(): ResourceCatalogV2 {
	return assembleResourceCatalogV2();
}
