import type {
	ResourceCategoryDefinition,
	ResourceDefinition,
	ResourceGroupDefinition,
} from './types';
import {
	CORE_RESOURCE_DEFINITIONS,
	getHappinessResourceDefinition,
	getPopulationGroupDefinitions,
	getPopulationResourceDefinitions,
	RESOURCE_CATEGORY_DEFINITIONS,
	STAT_RESOURCE_DEFINITIONS,
} from './definitions';
import {
	createResourceCategoryRegistry,
	createResourceGroupRegistry,
	createResourceRegistry,
	type ResourceCategoryRegistry,
	type ResourceGroupRegistry,
	type ResourceRegistry,
} from './registry';

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

	const happinessDefinition = getHappinessResourceDefinition();
	const populationResourceDefs = getPopulationResourceDefinitions();
	const populationGroupDefs = getPopulationGroupDefinitions();

	const resourceDefinitionsOrdered: readonly ResourceDefinition[] = [
		...CORE_RESOURCE_DEFINITIONS,
		happinessDefinition,
		...STAT_RESOURCE_DEFINITIONS,
		...populationResourceDefs,
	];
	const resourceGroupDefinitionsOrdered: readonly ResourceGroupDefinition[] = [
		...populationGroupDefs,
	];
	const categoryDefinitionsOrdered: readonly ResourceCategoryDefinition[] = [
		...RESOURCE_CATEGORY_DEFINITIONS,
	];

	cachedCatalog = {
		resources: createResourceRegistry(resourceDefinitionsOrdered),
		groups: createResourceGroupRegistry(resourceGroupDefinitionsOrdered),
		categories: createResourceCategoryRegistry(categoryDefinitionsOrdered),
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
