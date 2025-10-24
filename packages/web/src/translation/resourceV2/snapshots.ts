import { Resource, getResourceV2Id } from '@kingdom-builder/contents/resources';
import { PopulationRole } from '@kingdom-builder/contents/populationRoles';
import { Stat, getStatResourceV2Id } from '@kingdom-builder/contents/stats';
import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionResourceBoundsV2,
} from '@kingdom-builder/protocol';
import type {
	ResourceV2MetadataSnapshot,
	ResourceV2ValueSnapshot,
} from './formatters';
import type { TranslationSignedResourceGainSelectors } from '../context';

type LegacyBucket = 'resources' | 'stats' | 'population';

interface LegacyMapping {
	bucket: LegacyBucket;
	key: string;
}

const RESOURCE_V2_TO_LEGACY = new Map<string, LegacyMapping>();
const LEGACY_TO_RESOURCE_V2 = new Map<string, string>();

function registerLegacyMapping(
	bucket: LegacyBucket,
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

interface SnapshotContext {
	player: SessionPlayerStateSnapshot;
	forecastMap: ReadonlyMap<string, number>;
	signedGains: TranslationSignedResourceGainSelectors;
	populationRoleIds?: readonly string[];
	populationParentId?: string;
}

function resolveLegacyValue(
	player: SessionPlayerStateSnapshot,
	resourceId: string,
): number | undefined {
	const mapping = RESOURCE_V2_TO_LEGACY.get(resourceId);
	if (!mapping) {
		return undefined;
	}
	const bucket = mapping.bucket;
	const key = mapping.key;
	if (bucket === 'resources') {
		const value = player.resources?.[key];
		return typeof value === 'number' ? value : undefined;
	}
	if (bucket === 'stats') {
		const value = player.stats?.[key];
		return typeof value === 'number' ? value : undefined;
	}
	const value = player.population?.[key];
	return typeof value === 'number' ? value : undefined;
}

function sumPopulationRoles(
	player: SessionPlayerStateSnapshot,
	populationRoleIds: readonly string[] | undefined,
): number {
	if (!populationRoleIds?.length) {
		return 0;
	}
	const valuesV2 = player.valuesV2;
	if (valuesV2) {
		let total = 0;
		for (const roleId of populationRoleIds) {
			const entry = valuesV2[roleId];
			if (typeof entry === 'number') {
				total += entry;
			}
		}
		if (total !== 0) {
			return total;
		}
	}
	let legacyTotal = 0;
	for (const roleId of populationRoleIds) {
		const mapping = RESOURCE_V2_TO_LEGACY.get(roleId);
		if (!mapping) {
			continue;
		}
		const roleValue = player.population?.[mapping.key];
		if (typeof roleValue === 'number') {
			legacyTotal += roleValue;
		}
	}
	return legacyTotal;
}

function sumForecastForPopulation(
	forecastMap: ReadonlyMap<string, number>,
	populationRoleIds: readonly string[] | undefined,
): number | undefined {
	if (!populationRoleIds?.length) {
		return undefined;
	}
	let total = 0;
	let hasValue = false;
	for (const roleId of populationRoleIds) {
		const delta = forecastMap.get(roleId);
		if (typeof delta === 'number') {
			total += delta;
			hasValue = true;
		}
	}
	return hasValue ? total : undefined;
}

function resolveBounds(
	bounds: Record<string, SessionResourceBoundsV2> | undefined,
	resourceId: string,
): Pick<ResourceV2ValueSnapshot, 'lowerBound' | 'upperBound'> {
	const entry = bounds?.[resourceId];
	if (!entry) {
		return {};
	}
	const lowerBound =
		entry.lowerBound !== undefined && entry.lowerBound !== null
			? entry.lowerBound
			: undefined;
	const upperBound =
		entry.upperBound !== undefined && entry.upperBound !== null
			? entry.upperBound
			: undefined;
	return {
		...(lowerBound !== undefined ? { lowerBound } : {}),
		...(upperBound !== undefined ? { upperBound } : {}),
	};
}

export function createForecastMap(
	forecast: PlayerSnapshotDeltaBucket | undefined,
	populationParentId?: string,
	populationRoleIds?: readonly string[],
): Map<string, number> {
	const map = new Map<string, number>();
	if (!forecast) {
		return map;
	}
	const buckets: LegacyBucket[] = ['resources', 'stats', 'population'];
	for (const bucket of buckets) {
		const entries = forecast[bucket];
		if (!entries) {
			continue;
		}
		for (const [legacyKey, delta] of Object.entries(entries)) {
			if (typeof delta !== 'number') {
				continue;
			}
			const resourceId = LEGACY_TO_RESOURCE_V2.get(`${bucket}#${legacyKey}`);
			if (resourceId) {
				map.set(resourceId, delta);
			}
		}
	}
	if (populationParentId) {
		const total = sumForecastForPopulation(map, populationRoleIds);
		if (typeof total === 'number') {
			map.set(populationParentId, total);
		}
	}
	return map;
}

export function createResourceSnapshot(
	resourceId: string,
	context: SnapshotContext,
	overrides?: Partial<ResourceV2ValueSnapshot>,
): ResourceV2ValueSnapshot {
	const {
		player,
		forecastMap,
		signedGains,
		populationRoleIds,
		populationParentId,
	} = context;
	const bounds = resolveBounds(player.resourceBoundsV2, resourceId);
	let current = player.valuesV2?.[resourceId];
	if (typeof current !== 'number') {
		if (populationParentId && resourceId === populationParentId) {
			current = sumPopulationRoles(player, populationRoleIds);
		} else {
			current = resolveLegacyValue(player, resourceId) ?? 0;
		}
	}
	const resolvedCurrent = overrides?.current ?? current ?? 0;
	const forecastDelta = overrides?.forecastDelta ?? forecastMap.get(resourceId);
	const normalizedForecast =
		typeof forecastDelta === 'number' && forecastDelta !== 0
			? forecastDelta
			: undefined;
	const deltaOverride = overrides?.delta;
	const resolvedDelta =
		typeof deltaOverride === 'number'
			? deltaOverride
			: signedGains.sumForResource(resourceId);
	const normalizedDelta = resolvedDelta !== 0 ? resolvedDelta : undefined;
	const previous = overrides?.previous;
	return {
		id: resourceId,
		current: resolvedCurrent,
		...bounds,
		...(normalizedForecast !== undefined
			? { forecastDelta: normalizedForecast }
			: {}),
		...(normalizedDelta !== undefined ? { delta: normalizedDelta } : {}),
		...(previous !== undefined ? { previous } : {}),
	};
}

export function toDescriptorFromMetadata(
	metadata: ResourceV2MetadataSnapshot,
): { id: string; label: string; icon?: string; description?: string } {
	const descriptor: {
		id: string;
		label: string;
		icon?: string;
		description?: string;
	} = {
		id: metadata.id,
		label: metadata.label || metadata.id,
	};
	if (metadata.icon !== undefined) {
		descriptor.icon = metadata.icon;
	}
	if (metadata.description) {
		descriptor.description = metadata.description ?? undefined;
	}
	return descriptor;
}

export function getResourceIdForLegacy(
	bucket: LegacyBucket,
	key: string,
): string | undefined {
	return LEGACY_TO_RESOURCE_V2.get(`${bucket}#${key}`);
}

export function getLegacyMapping(
	resourceId: string,
): LegacyMapping | undefined {
	return RESOURCE_V2_TO_LEGACY.get(resourceId);
}

export function formatResourceTitle(
	metadata: ResourceV2MetadataSnapshot,
): string {
	const base = metadata.label || metadata.id;
	if (metadata.icon) {
		return `${metadata.icon} ${base}`.trim();
	}
	return base;
}
