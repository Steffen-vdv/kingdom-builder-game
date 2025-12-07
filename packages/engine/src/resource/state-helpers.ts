import type { PlayerState } from '../state';
import type {
	RuntimeBoundReference,
	RuntimeBoundValue,
	RuntimeReconciliationMode,
	RuntimeResourceCatalog,
	RuntimeResourceDefinition,
	RuntimeResourceGroupParent,
	RuntimeResourceTierTrack,
} from './types';

type ResourceDefinitionLike =
	| {
			kind: 'resource';
			definition: RuntimeResourceDefinition;
			groupId: string | null;
	  }
	| { kind: 'parent'; definition: RuntimeResourceGroupParent; groupId: string };

/**
 * Entry tracking a resource that depends on another resource for its bound.
 */
interface BoundDependentEntry {
	/** The ID of the resource that has a dynamic bound */
	readonly dependentId: string;
	/** Which bound references this resource ('lower' or 'upper') */
	readonly direction: 'lower' | 'upper';
	/** How to reconcile when the bound changes */
	readonly reconciliation: RuntimeReconciliationMode;
}

interface CatalogIndexes {
	readonly resourceById: RuntimeResourceCatalog['resources']['byId'];
	readonly parentById: Record<string, RuntimeResourceGroupParent>;
	readonly parentGroupByParentId: Record<string, string>;
	readonly groupChildren: Record<string, readonly string[]>;
	/**
	 * Maps a resource ID to the list of resources that reference it as a bound.
	 * Used for cascading reconciliation when a bound resource changes.
	 */
	readonly boundDependents: Record<string, readonly BoundDependentEntry[]>;
}

const catalogIndexCache = new WeakMap<RuntimeResourceCatalog, CatalogIndexes>();

/**
 * Helper to register a bound dependency if the bound is a reference.
 */
function registerBoundDependent(
	dependents: Record<string, BoundDependentEntry[]>,
	dependentId: string,
	bound: RuntimeBoundValue | undefined,
	direction: 'lower' | 'upper',
): void {
	if (!isBoundReference(bound)) {
		return;
	}
	const referencedId = bound.resourceId;
	const bucket = dependents[referencedId] ?? [];
	bucket.push({
		dependentId,
		direction,
		reconciliation: bound.reconciliation,
	});
	dependents[referencedId] = bucket;
}

function buildCatalogIndexes(catalog: RuntimeResourceCatalog): CatalogIndexes {
	const parentById: Record<string, RuntimeResourceGroupParent> = {};
	const parentGroupByParentId: Record<string, string> = {};
	const groupChildren: Record<string, readonly string[]> = {};
	const workingChildren: Record<string, string[]> = {};
	const workingDependents: Record<string, BoundDependentEntry[]> = {};
	for (const resource of catalog.resources.ordered) {
		// Track bound dependencies for cascading reconciliation
		registerBoundDependent(
			workingDependents,
			resource.id,
			resource.lowerBound,
			'lower',
		);
		registerBoundDependent(
			workingDependents,
			resource.id,
			resource.upperBound,
			'upper',
		);
		if (!resource.groupId) {
			continue;
		}
		const bucket = workingChildren[resource.groupId] ?? [];
		bucket.push(resource.id);
		workingChildren[resource.groupId] = bucket;
	}
	for (const group of catalog.groups.ordered) {
		const childIds = workingChildren[group.id] ?? [];
		groupChildren[group.id] = Object.freeze([...childIds]);
		if (!group.parent) {
			continue;
		}
		parentById[group.parent.id] = group.parent;
		parentGroupByParentId[group.parent.id] = group.id;
		// Track bound dependencies for parent resources too
		registerBoundDependent(
			workingDependents,
			group.parent.id,
			group.parent.lowerBound,
			'lower',
		);
		registerBoundDependent(
			workingDependents,
			group.parent.id,
			group.parent.upperBound,
			'upper',
		);
	}
	// Freeze all dependent arrays
	const boundDependents: Record<string, readonly BoundDependentEntry[]> = {};
	for (const [key, entries] of Object.entries(workingDependents)) {
		boundDependents[key] = Object.freeze([...entries]);
	}
	return {
		resourceById: catalog.resources.byId,
		parentById,
		parentGroupByParentId,
		groupChildren,
		boundDependents,
	};
}

export function getCatalogIndexes(
	catalog: RuntimeResourceCatalog,
): CatalogIndexes {
	const cached = catalogIndexCache.get(catalog);
	if (cached) {
		return cached;
	}
	const indexes = buildCatalogIndexes(catalog);
	catalogIndexCache.set(catalog, indexes);
	return indexes;
}

export function resolveResourceDefinition(
	catalog: RuntimeResourceCatalog,
	resourceId: string,
): ResourceDefinitionLike | null {
	const indexes = getCatalogIndexes(catalog);
	const resourceDef = indexes.resourceById[resourceId];
	if (resourceDef) {
		return {
			kind: 'resource',
			definition: resourceDef,
			groupId: resourceDef.groupId ?? null,
		};
	}
	const parentDef = indexes.parentById[resourceId];
	if (parentDef) {
		return {
			kind: 'parent',
			definition: parentDef,
			groupId: indexes.parentGroupByParentId[resourceId]!,
		};
	}
	return null;
}

/**
 * Check if a bound value is a reference (not a static number or null).
 */
export function isBoundReference(
	bound: RuntimeBoundValue | undefined,
): bound is RuntimeBoundReference {
	return bound !== null && bound !== undefined && typeof bound !== 'number';
}

/**
 * Resolves a RuntimeBoundValue to a numeric value or null.
 * - If the bound is a number, returns it directly.
 * - If the bound is null/undefined, returns null (unbounded).
 * - If the bound is a reference, looks up the referenced resource's value.
 *
 * @param bound - The bound value to resolve
 * @param resourceValues - Map of resource IDs to their current values
 * @returns The resolved numeric bound, or null if unbounded
 */
export function resolveBoundValue(
	bound: RuntimeBoundValue | undefined,
	resourceValues: Record<string, number>,
): number | null {
	if (bound === null || bound === undefined) {
		return null;
	}
	if (typeof bound === 'number') {
		return bound;
	}
	// It's a RuntimeBoundReference - look up the referenced resource's value
	const referencedValue = resourceValues[bound.resourceId];
	return referencedValue ?? null;
}

export function clampToBounds(
	value: number,
	lowerBound: number | null | undefined,
	upperBound: number | null | undefined,
): number {
	let next = value;
	if (typeof lowerBound === 'number' && next < lowerBound) {
		next = lowerBound;
	}
	if (typeof upperBound === 'number' && next > upperBound) {
		next = upperBound;
	}
	return next;
}

export function assertInteger(value: number, context: string): void {
	if (!Number.isInteger(value)) {
		throw new Error(
			`Resource state expected ${context} to be an integer but received ${value}.`,
		);
	}
}

export function clearRecord<T>(record: Record<string, T>): void {
	for (const key of Object.keys(record)) {
		delete record[key];
	}
}

export function ensureBoundFlags(
	player: PlayerState,
	resourceId: string,
): { lower: boolean; upper: boolean } {
	const existing = player.resourceBoundTouched[resourceId];
	if (existing) {
		return existing;
	}
	const created = { lower: false, upper: false };
	player.resourceBoundTouched[resourceId] = created;
	return created;
}

export function resolveTierId(
	track: RuntimeResourceTierTrack | undefined,
	value: number,
): string | null {
	if (!track) {
		return null;
	}
	for (const tier of track.tiers) {
		const { min, max } = tier.threshold;
		// Use loose inequality (!=) to treat both null and undefined as "no bound"
		if (min != null && value < min) {
			continue;
		}
		if (max != null && value > max) {
			continue;
		}
		return tier.id;
	}
	return null;
}

export function writeInitialState(
	player: PlayerState,
	resourceId: string,
	lowerBound: number | null,
	upperBound: number | null,
	tierTrack: RuntimeResourceTierTrack | undefined,
	value: number,
): void {
	player.resourceValues[resourceId] = value;
	player.resourceLowerBounds[resourceId] = lowerBound;
	player.resourceUpperBounds[resourceId] = upperBound;
	player.resourceTouched[resourceId] = false;
	player.resourceTierIds[resourceId] = resolveTierId(tierTrack, value);
	player.resourceBoundTouched[resourceId] = { lower: false, upper: false };
}

export function aggregateChildValues(
	player: PlayerState,
	childIds: readonly string[],
): number {
	let aggregate = 0;
	for (const childId of childIds) {
		aggregate += player.resourceValues[childId] ?? 0;
	}
	return aggregate;
}

export type { BoundDependentEntry, CatalogIndexes, ResourceDefinitionLike };
