import { Resource, getResourceV2Id } from '@kingdom-builder/contents/resources';
import { PopulationRole } from '@kingdom-builder/contents/populationRoles';
import { Stat, getStatResourceV2Id } from '@kingdom-builder/contents/stats';

export type ResourceV2LegacyBucket = 'resources' | 'stats' | 'population';

export interface ResourceV2LegacyMapping {
	bucket: ResourceV2LegacyBucket;
	key: string;
}

const RESOURCE_V2_TO_LEGACY = new Map<string, ResourceV2LegacyMapping>();
const LEGACY_TO_RESOURCE_V2 = new Map<string, string>();

function registerLegacyMapping(
	bucket: ResourceV2LegacyBucket,
	key: string,
	resourceId: string,
): void {
	RESOURCE_V2_TO_LEGACY.set(resourceId, { bucket, key });
	LEGACY_TO_RESOURCE_V2.set(`${bucket}#${key}`, resourceId);
}

for (const key of Object.values(Resource)) {
	registerLegacyMapping('resources', key, getResourceV2Id(key));
}

for (const key of Object.values(Stat)) {
	registerLegacyMapping('stats', key, getStatResourceV2Id(key));
}

const POPULATION_ROLE_PREFIX = 'resource:population:role:' as const;

for (const role of Object.values(PopulationRole)) {
	registerLegacyMapping('population', role, `${POPULATION_ROLE_PREFIX}${role}`);
}

export function getResourceIdForLegacy(
	bucket: ResourceV2LegacyBucket,
	key: string,
): string | undefined {
	return LEGACY_TO_RESOURCE_V2.get(`${bucket}#${key}`);
}

export function getLegacyMapping(
	resourceId: string,
): ResourceV2LegacyMapping | undefined {
	return RESOURCE_V2_TO_LEGACY.get(resourceId);
}
