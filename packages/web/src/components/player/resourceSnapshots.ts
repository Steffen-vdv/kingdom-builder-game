import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionResourceBounds,
	SessionResourceBoundValue,
} from '@kingdom-builder/protocol';
import type {
	ResourceMetadataSnapshot,
	ResourceValueSnapshot,
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
	const values = player.values;
	let total = 0;
	for (const roleId of populationRoleIds) {
		const entry = values?.[roleId];
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
	bound: SessionResourceBoundValue | null | undefined,
	values: Record<string, number> | undefined,
): number | null {
	if (bound === null || bound === undefined) {
		return null;
	}
	if (typeof bound === 'number') {
		return bound;
	}
	// It's a bound reference - look up the value from the referenced resource
	if (typeof bound === 'object' && 'resourceId' in bound) {
		const refValue = values?.[bound.resourceId];
		return typeof refValue === 'number' ? refValue : null;
	}
	return null;
}

function resolveBounds(
	bounds: Record<string, SessionResourceBounds> | undefined,
	resourceId: string,
	values: Record<string, number> | undefined,
): Pick<ResourceValueSnapshot, 'lowerBound' | 'upperBound'> {
	const entry = bounds?.[resourceId];
	if (!entry) {
		return {};
	}
	const lowerBound = resolveBoundValueToNumber(entry.lowerBound, values);
	const upperBound = resolveBoundValueToNumber(entry.upperBound, values);
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
	if (!forecast || !forecast.values) {
		return map;
	}
	for (const [resourceId, delta] of Object.entries(forecast.values)) {
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
	overrides?: Partial<ResourceValueSnapshot>,
): ResourceValueSnapshot {
	const {
		player,
		forecastMap,
		signedGains,
		populationRoleIds,
		populationParentId,
	} = context;
	const bounds = resolveBounds(
		player.resourceBounds,
		resourceId,
		player.values,
	);
	let current = player.values?.[resourceId];
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

export function toDescriptorFromMetadata(metadata: ResourceMetadataSnapshot): {
	id: string;
	label: string;
	icon?: string;
	description?: string;
} {
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
	metadata: ResourceMetadataSnapshot,
): string {
	const base = metadata.label || metadata.id;
	if (metadata.icon) {
		return `${metadata.icon} ${base}`.trim();
	}
	return base;
}
