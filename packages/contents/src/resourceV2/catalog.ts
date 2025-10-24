import type { ResourceV2Definition, ResourceV2GroupDefinition } from './types';
import { CORE_RESOURCE_DEFINITIONS, HAPPINESS_RESOURCE_DEFINITION, POPULATION_GROUP_DEFINITIONS, POPULATION_RESOURCE_DEFINITIONS, STAT_RESOURCE_DEFINITIONS } from './definitions';
import { createResourceGroupRegistry, createResourceV2Registry, type ResourceGroupRegistry, type ResourceV2Registry } from './registry';

const RESOURCE_DEFINITIONS_ORDERED: readonly ResourceV2Definition[] = [...CORE_RESOURCE_DEFINITIONS, HAPPINESS_RESOURCE_DEFINITION, ...STAT_RESOURCE_DEFINITIONS, ...POPULATION_RESOURCE_DEFINITIONS];

const RESOURCE_GROUP_DEFINITIONS_ORDERED: readonly ResourceV2GroupDefinition[] = [...POPULATION_GROUP_DEFINITIONS];

export interface ResourceCatalogV2 {
	readonly resources: ResourceV2Registry;
	readonly groups: ResourceGroupRegistry;
}

function assembleResourceCatalogV2(): ResourceCatalogV2 {
	return {
		resources: createResourceV2Registry(RESOURCE_DEFINITIONS_ORDERED),
		groups: createResourceGroupRegistry(RESOURCE_GROUP_DEFINITIONS_ORDERED),
	};
}

const RESOURCE_CATALOG_V2 = assembleResourceCatalogV2();

export const RESOURCE_V2_REGISTRY = RESOURCE_CATALOG_V2.resources;
export const RESOURCE_GROUP_V2_REGISTRY = RESOURCE_CATALOG_V2.groups;

export function buildResourceCatalogV2(): ResourceCatalogV2 {
	return assembleResourceCatalogV2();
}
