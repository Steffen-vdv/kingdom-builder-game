import type { ResourceV2Definition, ResourceV2GroupDefinition } from './types';
import { createResourceGroupRegistry, createResourceV2Registry } from './registry';
import { CORE_RESOURCE_DEFINITIONS, HAPPINESS_RESOURCE_DEFINITION, POPULATION_GROUP_DEFINITIONS, POPULATION_RESOURCE_DEFINITIONS, STAT_RESOURCE_DEFINITIONS } from './definitions';

const RESOURCE_DEFINITIONS = Object.freeze([
	...CORE_RESOURCE_DEFINITIONS,
	HAPPINESS_RESOURCE_DEFINITION,
	...STAT_RESOURCE_DEFINITIONS,
	...POPULATION_RESOURCE_DEFINITIONS,
] as const satisfies readonly ResourceV2Definition[]);

const RESOURCE_GROUP_DEFINITIONS = Object.freeze([...POPULATION_GROUP_DEFINITIONS] as const satisfies readonly ResourceV2GroupDefinition[]);

export const RESOURCE_V2_REGISTRY = createResourceV2Registry(RESOURCE_DEFINITIONS);

export const RESOURCE_GROUP_V2_REGISTRY = createResourceGroupRegistry(RESOURCE_GROUP_DEFINITIONS);

export function buildResourceCatalogV2() {
	return {
		resources: RESOURCE_DEFINITIONS,
		groups: RESOURCE_GROUP_DEFINITIONS,
		resourceRegistry: RESOURCE_V2_REGISTRY,
		groupRegistry: RESOURCE_GROUP_V2_REGISTRY,
	} as const;
}
