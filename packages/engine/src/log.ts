import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { PassiveSummary } from './services';
import type { SessionResourceBoundsV2 } from '@kingdom-builder/protocol';
import type { RuntimeResourceCatalog } from './resource-v2';
import {
	isBoundReference,
	resolveBoundValue,
	resolveResourceDefinition,
} from './resource-v2/state-helpers';

export interface PlayerSnapshot {
	/**
	 * Unified ResourceV2 value map containing all resources, stats, and
	 * population counts keyed by their V2 identifiers.
	 */
	valuesV2: Record<string, number>;
	resourceBoundsV2: Record<string, SessionResourceBoundsV2>;
	buildings: string[];
	lands: {
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}[];
	passives: PassiveSummary[];
}

function cloneValuesV2(player: PlayerState): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const [resourceId, value] of Object.entries(player.resourceValues)) {
		snapshot[resourceId] = value ?? 0;
	}
	return snapshot;
}

/**
 * Resolves the effective bound for a resource, considering dynamic references.
 * If the bound was explicitly modified (touched), uses the stored value.
 * Otherwise, resolves from the definition (which may be a dynamic reference).
 */
function resolveEffectiveBound(
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	direction: 'lower' | 'upper',
): number | null {
	const touched = player.resourceBoundTouched[resourceId]?.[direction];
	const storedBound =
		direction === 'lower'
			? player.resourceLowerBounds[resourceId]
			: player.resourceUpperBounds[resourceId];

	// If explicitly modified, use stored value (resolve in case it's a ref)
	if (touched) {
		return resolveBoundValue(storedBound, player.resourceValues);
	}

	// Not touched - check definition for dynamic reference
	const lookup = resolveResourceDefinition(catalog, resourceId);
	if (!lookup) {
		return resolveBoundValue(storedBound, player.resourceValues);
	}

	const defBound =
		direction === 'lower'
			? lookup.definition.lowerBound
			: lookup.definition.upperBound;

	// If definition has a dynamic reference, resolve it from current values
	if (isBoundReference(defBound)) {
		return resolveBoundValue(defBound, player.resourceValues);
	}

	// Static bound - use stored (resolve in case type includes references)
	return resolveBoundValue(storedBound, player.resourceValues);
}

function buildResourceBoundsSnapshot(
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
): Record<string, SessionResourceBoundsV2> {
	const snapshot: Record<string, SessionResourceBoundsV2> = {};
	const keys = new Set(
		Object.keys(player.resourceValues).concat(
			Object.keys(player.resourceLowerBounds),
			Object.keys(player.resourceUpperBounds),
		),
	);
	for (const resourceId of keys) {
		const lower = resolveEffectiveBound(player, catalog, resourceId, 'lower');
		const upper = resolveEffectiveBound(player, catalog, resourceId, 'upper');
		snapshot[resourceId] = { lowerBound: lower, upperBound: upper };
	}
	return snapshot;
}

export function snapshotPlayer(
	player: PlayerState,
	engineContext: EngineContext,
): PlayerSnapshot {
	return {
		valuesV2: cloneValuesV2(player),
		resourceBoundsV2: buildResourceBoundsSnapshot(
			player,
			engineContext.resourceCatalogV2,
		),
		buildings: Array.from(player.buildings),
		lands: player.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: engineContext.passives.list(player.id),
	};
}

export interface ActionTrace {
	id: string;
	before: PlayerSnapshot;
	after: PlayerSnapshot;
}
