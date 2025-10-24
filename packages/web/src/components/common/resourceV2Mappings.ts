import { Resource, getResourceV2Id } from '@kingdom-builder/contents/resources';
import { PopulationRole } from '@kingdom-builder/contents/populationRoles';
import { Stat, getStatResourceV2Id } from '@kingdom-builder/contents/stats';

export type LegacyResourceBucket = 'resources' | 'stats' | 'population';

export interface LegacyResourceMapping {
	bucket: LegacyResourceBucket;
	key: string;
}

const RESOURCE_V2_TO_LEGACY = new Map<string, LegacyResourceMapping>();
const LEGACY_TO_RESOURCE_V2 = new Map<string, string>();

function registerLegacyMapping(
	bucket: LegacyResourceBucket,
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

export function getLegacyMapping(
	resourceId: string,
): LegacyResourceMapping | undefined {
	return RESOURCE_V2_TO_LEGACY.get(resourceId);
}

export function getResourceIdForLegacy(
	bucket: LegacyResourceBucket,
	key: string,
): string | undefined {
	return LEGACY_TO_RESOURCE_V2.get(`${bucket}#${key}`);
}

export function inferResourceIdFromLegacy(key: string): string | undefined {
	return (
		getResourceIdForLegacy('resources', key) ??
		getResourceIdForLegacy('stats', key) ??
		getResourceIdForLegacy('population', key)
	);
}

export { POPULATION_ROLE_PREFIX };
