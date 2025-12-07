import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionResourceBoundsV2,
	SessionResourceBoundValueV2,
} from '@kingdom-builder/protocol';
import type {
	ResourceV2MetadataSnapshot,
	ResourceV2ValueSnapshot,
} from '../../translation';
import type { TranslationSignedResourceGainSelectors } from '../../translation/context';

interface SnapshotContext {
	player: SessionPlayerStateSnapshot;
	forecastMap: ReadonlyMap<string, number>;
	signedGains: TranslationSignedResourceGainSelectors;
	populationRoleIds?: readonly string[];
	populationParentId?: string;
}

function sumPopulationRoles(
	player: SessionPlayerStateSnapshot,
	populationRoleIds: readonly string[] | undefined,
): number {
	if (!populationRoleIds?.length) {
		return 0;
	}
	const valuesV2 = player.valuesV2;
	let total = 0;
	for (const roleId of populationRoleIds) {
		const entry = valuesV2?.[roleId];
		if (typeof entry === 'number') {
			total += entry;
		}
	}
	return total;
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

/**
 * Resolves a single bound value to a number, handling both static numbers
 * and dynamic bound references.
 */
function resolveBoundValueToNumber(
	bound: SessionResourceBoundValueV2 | null | undefined,
	valuesV2: Record<string, number> | undefined,
): number | null {
	if (bound === null || bound === undefined) {
		return null;
	}
	if (typeof bound === 'number') {
		return bound;
	}
	// It's a bound reference - look up the value from the referenced resource
	if (typeof bound === 'object' && 'resourceId' in bound) {
		const refValue = valuesV2?.[bound.resourceId];
		return typeof refValue === 'number' ? refValue : null;
	}
	return null;
}

function resolveBounds(
	bounds: Record<string, SessionResourceBoundsV2> | undefined,
	resourceId: string,
	valuesV2: Record<string, number> | undefined,
): Pick<ResourceV2ValueSnapshot, 'lowerBound' | 'upperBound'> {
	const entry = bounds?.[resourceId];
	if (!entry) {
		return {};
	}
	const lowerBound = resolveBoundValueToNumber(entry.lowerBound, valuesV2);
	const upperBound = resolveBoundValueToNumber(entry.upperBound, valuesV2);
	return {
		...(lowerBound !== null ? { lowerBound } : {}),
		...(upperBound !== null ? { upperBound } : {}),
	};
}

export function createForecastMap(
	forecast: PlayerSnapshotDeltaBucket | undefined,
	populationParentId?: string,
	populationRoleIds?: readonly string[],
): Map<string, number> {
	const map = new Map<string, number>();
	if (!forecast || !forecast.valuesV2) {
		return map;
	}
	for (const [resourceId, delta] of Object.entries(forecast.valuesV2)) {
		if (typeof delta !== 'number') {
			continue;
		}
		map.set(resourceId, delta);
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
	const bounds = resolveBounds(
		player.resourceBoundsV2,
		resourceId,
		player.valuesV2,
	);
	let current = player.valuesV2?.[resourceId];
	if (typeof current !== 'number') {
		if (populationParentId && resourceId === populationParentId) {
			current = sumPopulationRoles(player, populationRoleIds);
		} else {
			current = 0;
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

export function formatResourceTitle(
	metadata: ResourceV2MetadataSnapshot,
): string {
	const base = metadata.label || metadata.id;
	if (metadata.icon) {
		return `${metadata.icon} ${base}`.trim();
	}
	return base;
}
