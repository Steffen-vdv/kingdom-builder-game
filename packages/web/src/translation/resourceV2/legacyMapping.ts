import { Resource } from '@kingdom-builder/contents/resourceKeys';
import { PopulationRole } from '@kingdom-builder/contents/populationRoles';
import { Stat } from '@kingdom-builder/contents/stats';

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

// Register resource keys: map legacy key (e.g., 'gold') to V2 id
for (const [legacyKey, v2Id] of Object.entries(Resource)) {
	registerLegacyMapping('resources', legacyKey, v2Id);
}

// Register stat keys: both legacy and V2 keys should map to the same legacy key
for (const [legacyKey, v2Id] of Object.entries(Stat)) {
	// Map legacy key (e.g., 'fortificationStrength') to V2 id
	registerLegacyMapping('stats', legacyKey, v2Id);
	// Also allow looking up V2 id to get the legacy key for resolution
	// Map stores v2Id -> { bucket: 'stats', key: legacyKey }
	RESOURCE_V2_TO_LEGACY.set(v2Id, { bucket: 'stats', key: legacyKey });
	LEGACY_TO_RESOURCE_V2.set(`stats#${v2Id}`, v2Id);
}

const POPULATION_ROLE_PREFIX = 'resource:core:' as const;

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
