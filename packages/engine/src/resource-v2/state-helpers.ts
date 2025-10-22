import type { PlayerState } from '../state';
import type {
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

interface CatalogIndexes {
	readonly resourceById: RuntimeResourceCatalog['resources']['byId'];
	readonly parentById: Record<string, RuntimeResourceGroupParent>;
	readonly parentGroupByParentId: Record<string, string>;
	readonly groupChildren: Record<string, readonly string[]>;
}

const catalogIndexCache = new WeakMap<RuntimeResourceCatalog, CatalogIndexes>();

function buildCatalogIndexes(catalog: RuntimeResourceCatalog): CatalogIndexes {
	const parentById: Record<string, RuntimeResourceGroupParent> = {};
	const parentGroupByParentId: Record<string, string> = {};
	const groupChildren: Record<string, readonly string[]> = {};
	const workingChildren: Record<string, string[]> = {};
	for (const resource of catalog.resources.ordered) {
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
	}
	return {
		resourceById: catalog.resources.byId,
		parentById,
		parentGroupByParentId,
		groupChildren,
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
			`ResourceV2 state expected ${context} to be an integer but received ${value}.`,
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
		if (min !== null && value < min) {
			continue;
		}
		if (max !== null && value > max) {
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

export type { CatalogIndexes, ResourceDefinitionLike };
