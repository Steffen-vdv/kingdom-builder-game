import type { EngineContext } from '../context';
import type { PlayerState } from '../state';
import type { RuntimeResourceCatalog } from './types';
import {
	aggregateChildValues,
	assertInteger,
	clampToBounds,
	clearRecord,
	ensureBoundFlags,
	getCatalogIndexes,
	resolveResourceDefinition,
	resolveTierId,
	writeInitialState,
	type ResourceDefinitionLike,
} from './state-helpers';

interface ApplyValueOptions {
	readonly suppressTouched?: boolean;
	readonly suppressRecentEntry?: boolean;
	readonly skipTierUpdate?: boolean;
}

export type SetResourceValueOptions = ApplyValueOptions;

export type RecalculateParentValueOptions = ApplyValueOptions;

export interface AdjustBoundResult {
	readonly previousBound: number | null;
	readonly nextBound: number | null;
	readonly valueClamped: boolean;
}

function applyValue(
	context: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	lookup: ResourceDefinitionLike,
	resourceId: string,
	value: number,
	options: ApplyValueOptions = {},
): number {
	assertInteger(value, `"${resourceId}" value`);
	const {
		suppressTouched = false,
		suppressRecentEntry = false,
		skipTierUpdate = false,
	} = options;
	const lowerBound = player.resourceLowerBounds[resourceId];
	const upperBound = player.resourceUpperBounds[resourceId];
	const resolvedLower =
		typeof lowerBound === 'number'
			? lowerBound
			: (lookup.definition.lowerBound ?? null);
	const resolvedUpper =
		typeof upperBound === 'number'
			? upperBound
			: (lookup.definition.upperBound ?? null);
	const previous =
		player.resourceValues[resourceId] ??
		clampToBounds(0, resolvedLower, resolvedUpper);
	const clamped = clampToBounds(value, resolvedLower, resolvedUpper);
	if (clamped === previous) {
		if (!skipTierUpdate) {
			player.resourceTierIds[resourceId] = resolveTierId(
				lookup.definition.tierTrack,
				clamped,
			);
		}
		return previous;
	}
	player.resourceValues[resourceId] = clamped;
	if (!suppressTouched) {
		player.resourceTouched[resourceId] = true;
	}
	if (!skipTierUpdate) {
		player.resourceTierIds[resourceId] = resolveTierId(
			lookup.definition.tierTrack,
			clamped,
		);
	}
	const delta = clamped - previous;
	if (!suppressRecentEntry && context && delta !== 0) {
		context.recentResourceGains.push({
			key: resourceId,
			amount: delta,
		});
	}
	if (lookup.kind === 'resource' && lookup.groupId) {
		recalculateGroupParentValue(context, player, catalog, lookup.groupId, {
			suppressTouched,
			suppressRecentEntry: true,
			skipTierUpdate,
		});
	}
	return clamped;
}

export function initialisePlayerResourceState(
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
): void {
	const records: Record<string, unknown>[] = [
		player.resourceValues,
		player.resourceLowerBounds,
		player.resourceUpperBounds,
		player.resourceTouched,
		player.resourceTierIds,
		player.resourceBoundTouched,
	];
	for (const record of records) {
		clearRecord(record);
	}
	const indexes = getCatalogIndexes(catalog);
	for (const resource of catalog.resources.ordered) {
		const lower = resource.lowerBound ?? null;
		const upper = resource.upperBound ?? null;
		const initialValue = clampToBounds(0, lower, upper);
		writeInitialState(
			player,
			resource.id,
			lower,
			upper,
			resource.tierTrack,
			initialValue,
		);
	}
	for (const group of catalog.groups.ordered) {
		if (!group.parent) {
			continue;
		}
		const childIds = indexes.groupChildren[group.id] ?? [];
		const lower = group.parent.lowerBound ?? null;
		const upper = group.parent.upperBound ?? null;
		const aggregate = aggregateChildValues(player, childIds);
		const initialValue = clampToBounds(aggregate, lower, upper);
		writeInitialState(
			player,
			group.parent.id,
			lower,
			upper,
			group.parent.tierTrack,
			initialValue,
		);
	}
}

export function getResourceValue(
	player: PlayerState,
	resourceId: string,
): number {
	return player.resourceValues[resourceId] ?? 0;
}

export function setResourceValue(
	context: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	value: number,
	options: SetResourceValueOptions = {},
): number {
	const lookup = resolveResourceDefinition(catalog, resourceId);
	if (!lookup || lookup.kind !== 'resource') {
		throw new Error(
			`ResourceV2 state does not recognise resource "${resourceId}".`,
		);
	}
	return applyValue(
		context,
		player,
		catalog,
		lookup,
		resourceId,
		value,
		options,
	);
}

export function recalculateGroupParentValue(
	context: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	groupId: string,
	options: RecalculateParentValueOptions = {},
): number | null {
	const group = catalog.groups.byId[groupId];
	if (!group || !group.parent) {
		return null;
	}
	const indexes = getCatalogIndexes(catalog);
	const childIds = indexes.groupChildren[groupId] ?? [];
	let aggregate = 0;
	for (const childId of childIds) {
		aggregate += player.resourceValues[childId] ?? 0;
	}
	return applyValue(
		context,
		player,
		catalog,
		{
			kind: 'parent',
			definition: group.parent,
			groupId,
		},
		group.parent.id,
		aggregate,
		options,
	);
}

type BoundDirection = 'lower' | 'upper';

function adjustResourceBound(
	context: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	delta: number,
	direction: BoundDirection,
): AdjustBoundResult {
	const directionLabel = direction === 'lower' ? 'lower' : 'upper';
	assertInteger(delta, `"${resourceId}" ${directionLabel}-bound delta`);
	if (delta <= 0) {
		throw new Error(
			`ResourceV2 state expected ${directionLabel}-bound delta for "${resourceId}" to be positive but received ${delta}.`,
		);
	}
	const lookup = resolveResourceDefinition(catalog, resourceId);
	if (!lookup) {
		throw new Error(
			`ResourceV2 state does not recognise resource "${resourceId}".`,
		);
	}
	const boundMap =
		direction === 'lower'
			? player.resourceLowerBounds
			: player.resourceUpperBounds;
	const definitionBound =
		direction === 'lower'
			? lookup.definition.lowerBound
			: lookup.definition.upperBound;
	const previousRaw = boundMap[resourceId];
	const previousBound =
		typeof previousRaw === 'number' ? previousRaw : (definitionBound ?? null);
	const nextBase = typeof previousBound === 'number' ? previousBound : 0;
	const nextBound = nextBase + delta;
	if (direction === 'lower') {
		player.resourceLowerBounds[resourceId] = nextBound;
	} else {
		player.resourceUpperBounds[resourceId] = nextBound;
	}
	const flags = ensureBoundFlags(player, resourceId);
	flags[direction] = true;
	if (lookup.kind === 'parent') {
		if (direction === 'lower') {
			const childIds =
				getCatalogIndexes(catalog).groupChildren[lookup.groupId] ?? [];
			const aggregate = aggregateChildValues(player, childIds);
			if (aggregate < nextBound) {
				throw new Error(
					`ResourceV2 parent "${resourceId}" cannot raise lower bound beyond its aggregated child total of ${aggregate}.`,
				);
			}
		}
		return { previousBound, nextBound, valueClamped: false };
	}
	const current = player.resourceValues[resourceId] ?? 0;
	let target = current;
	if (direction === 'lower' && current < nextBound) {
		target = nextBound;
	} else if (direction === 'upper' && current > nextBound) {
		target = nextBound;
	} else {
		return { previousBound, nextBound, valueClamped: false };
	}
	applyValue(context, player, catalog, lookup, resourceId, target);
	return { previousBound, nextBound, valueClamped: true };
}

export function increaseResourceLowerBound(
	context: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	delta: number,
): AdjustBoundResult {
	return adjustResourceBound(
		context,
		player,
		catalog,
		resourceId,
		delta,
		'lower',
	);
}

export function increaseResourceUpperBound(
	context: EngineContext | null | undefined,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	delta: number,
): AdjustBoundResult {
	return adjustResourceBound(
		context,
		player,
		catalog,
		resourceId,
		delta,
		'upper',
	);
}
