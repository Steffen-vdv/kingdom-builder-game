import type { ResourceCategoryDefinition, ResourceDefinition, ResourceGroupDefinition } from './types';
import { getResourceDefinitions, getResourceGroupDefinitions, getResourceCategoryDefinitions } from '../../resources';
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

	cachedCatalog = {
		resources: createResourceRegistry(getResourceDefinitions()),
		groups: createResourceGroupRegistry(getResourceGroupDefinitions()),
		categories: createResourceCategoryRegistry(getResourceCategoryDefinitions()),
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
function getResourceRegistry(): ResourceRegistry {
	return assembleResourceCatalog().resources;
}

function getGroupRegistry(): ResourceGroupRegistry {
	return assembleResourceCatalog().groups;
}

function getCategoryRegistry(): ResourceCategoryRegistry {
	return assembleResourceCatalog().categories;
}

// Proxy objects defer registry construction until first property access,
// breaking circular dependencies during module initialization.
export const RESOURCE_REGISTRY = new Proxy({} as ResourceRegistry, {
	get(_, prop) {
		return getResourceRegistry()[prop as keyof ResourceRegistry];
	},
});

export const RESOURCE_GROUP_REGISTRY = new Proxy({} as ResourceGroupRegistry, {
	get(_, prop) {
		return getGroupRegistry()[prop as keyof ResourceGroupRegistry];
	},
});

export const RESOURCE_CATEGORY_REGISTRY = new Proxy({} as ResourceCategoryRegistry, {
	get(_, prop) {
		return getCategoryRegistry()[prop as keyof ResourceCategoryRegistry];
	},
});

export function buildResourceCatalog(): ResourceCatalog {
	return assembleResourceCatalog();
}
