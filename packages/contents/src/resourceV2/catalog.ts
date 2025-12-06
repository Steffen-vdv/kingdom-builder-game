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

	// Call getter to get happiness definition lazily
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

// Use getters to ensure lazy initialization
let _resourceRegistry: ResourceV2Registry | null = null;
let _groupRegistry: ResourceGroupRegistry | null = null;
let _categoryRegistry: ResourceCategoryRegistry | null = null;

function getResourceRegistry(): ResourceV2Registry {
	if (!_resourceRegistry) {
		_resourceRegistry = assembleResourceCatalogV2().resources;
	}
	return _resourceRegistry;
}

function getGroupRegistry(): ResourceGroupRegistry {
	if (!_groupRegistry) {
		_groupRegistry = assembleResourceCatalogV2().groups;
	}
	return _groupRegistry;
}

function getCategoryRegistry(): ResourceCategoryRegistry {
	if (!_categoryRegistry) {
		_categoryRegistry = assembleResourceCatalogV2().categories;
	}
	return _categoryRegistry;
}

// Export as Proxies for backward compatibility - accesses are lazy
export const RESOURCE_V2_REGISTRY = new Proxy({} as ResourceV2Registry, {
	get(target, prop) {
		return getResourceRegistry()[prop as keyof ResourceV2Registry];
	},
});

export const RESOURCE_GROUP_V2_REGISTRY = new Proxy({} as ResourceGroupRegistry, {
	get(target, prop) {
		return getGroupRegistry()[prop as keyof ResourceGroupRegistry];
	},
});

export const RESOURCE_CATEGORY_V2_REGISTRY = new Proxy({} as ResourceCategoryRegistry, {
	get(target, prop) {
		return getCategoryRegistry()[prop as keyof ResourceCategoryRegistry];
	},
});

export function buildResourceCatalogV2(): ResourceCatalogV2 {
	return assembleResourceCatalogV2();
}
