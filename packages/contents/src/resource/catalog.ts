import type { ResourceCategoryDefinition, ResourceDefinition, ResourceGroupDefinition } from './types';
import {
	CORE_RESOURCE_DEFINITIONS,
	getHappinessResourceDefinition,
	POPULATION_GROUP_DEFINITIONS,
	POPULATION_RESOURCE_DEFINITIONS,
	RESOURCE_CATEGORY_DEFINITIONS,
	STAT_RESOURCE_DEFINITIONS,
} from './definitions';
import { createResourceCategoryRegistry, createResourceGroupRegistry, createResourceRegistry, type ResourceCategoryRegistry, type ResourceGroupRegistry, type ResourceRegistry } from './registry';

export interface ResourceCatalog {
	readonly resources: ResourceRegistry;
	readonly groups: ResourceGroupRegistry;
	readonly categories: ResourceCategoryRegistry;
}

let cachedCatalog: ResourceCatalog | null = null;

function assembleResourceCatalog(): ResourceCatalog {
	if (cachedCatalog) {
		return cachedCatalog;
	}

	// Call getter to get happiness definition lazily
	const HAPPINESS_RESOURCE_DEFINITION = getHappinessResourceDefinition();

	const RESOURCE_DEFINITIONS_ORDERED: readonly ResourceDefinition[] = [...CORE_RESOURCE_DEFINITIONS, HAPPINESS_RESOURCE_DEFINITION, ...STAT_RESOURCE_DEFINITIONS, ...POPULATION_RESOURCE_DEFINITIONS];
	const RESOURCE_GROUP_DEFINITIONS_ORDERED: readonly ResourceGroupDefinition[] = [...POPULATION_GROUP_DEFINITIONS];
	const CATEGORY_DEFINITIONS_ORDERED: readonly ResourceCategoryDefinition[] = [...RESOURCE_CATEGORY_DEFINITIONS];

	cachedCatalog = {
		resources: createResourceRegistry(RESOURCE_DEFINITIONS_ORDERED),
		groups: createResourceGroupRegistry(RESOURCE_GROUP_DEFINITIONS_ORDERED),
		categories: createResourceCategoryRegistry(CATEGORY_DEFINITIONS_ORDERED),
	};

	return cachedCatalog;
}

// Use getters to ensure lazy initialization
let _resourceRegistry: ResourceRegistry | null = null;
let _groupRegistry: ResourceGroupRegistry | null = null;
let _categoryRegistry: ResourceCategoryRegistry | null = null;

function getResourceRegistry(): ResourceRegistry {
	if (!_resourceRegistry) {
		_resourceRegistry = assembleResourceCatalog().resources;
	}
	return _resourceRegistry;
}

function getGroupRegistry(): ResourceGroupRegistry {
	if (!_groupRegistry) {
		_groupRegistry = assembleResourceCatalog().groups;
	}
	return _groupRegistry;
}

function getCategoryRegistry(): ResourceCategoryRegistry {
	if (!_categoryRegistry) {
		_categoryRegistry = assembleResourceCatalog().categories;
	}
	return _categoryRegistry;
}

// Export as Proxies for backward compatibility - accesses are lazy
export const RESOURCE_REGISTRY = new Proxy({} as ResourceRegistry, {
	get(target, prop) {
		return getResourceRegistry()[prop as keyof ResourceRegistry];
	},
});

export const RESOURCE_GROUP_REGISTRY = new Proxy({} as ResourceGroupRegistry, {
	get(target, prop) {
		return getGroupRegistry()[prop as keyof ResourceGroupRegistry];
	},
});

export const RESOURCE_CATEGORY_REGISTRY = new Proxy({} as ResourceCategoryRegistry, {
	get(target, prop) {
		return getCategoryRegistry()[prop as keyof ResourceCategoryRegistry];
	},
});

export function buildResourceCatalog(): ResourceCatalog {
	return assembleResourceCatalog();
}
