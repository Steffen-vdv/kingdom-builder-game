import type { ResourceV2Definition, ResourceV2GroupDefinition } from './types';
import { CORE_RESOURCE_DEFINITIONS, getHappinessResourceDefinition, POPULATION_GROUP_DEFINITIONS, POPULATION_RESOURCE_DEFINITIONS, STAT_RESOURCE_DEFINITIONS } from './definitions';
import { createResourceGroupRegistry, createResourceV2Registry, type ResourceGroupRegistry, type ResourceV2Registry } from './registry';

export interface ResourceCatalogV2 {
	readonly resources: ResourceV2Registry;
	readonly groups: ResourceGroupRegistry;
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

	cachedCatalog = {
		resources: createResourceV2Registry(RESOURCE_DEFINITIONS_ORDERED),
		groups: createResourceGroupRegistry(RESOURCE_GROUP_DEFINITIONS_ORDERED),
	};

	return cachedCatalog;
}

// Use getters to ensure lazy initialization
let _resourceRegistry: ResourceV2Registry | null = null;
let _groupRegistry: ResourceGroupRegistry | null = null;

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

export function buildResourceCatalogV2(): ResourceCatalogV2 {
	return assembleResourceCatalogV2();
}
