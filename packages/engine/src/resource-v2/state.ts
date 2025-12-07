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
	isBoundReference,
	resolveBoundValue,
	resolveResourceDefinition,
	resolveTierId,
	writeInitialState,
	type ResourceDefinitionLike,
} from './state-helpers';

interface ApplyValueOptions {
	readonly suppressRecentEntry?: boolean;
	readonly skipTierUpdate?: boolean;
	/**
	 * When true, skip clamping to bounds. Used by 'pass' reconciliation mode
	 * to allow values outside defined bounds.
	 */
	readonly skipBoundClamp?: boolean;
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
	if (!lookup.definition.allowDecimal) {
		assertInteger(value, `"${resourceId}" value`);
	}
	const {
		suppressRecentEntry = false,
		skipTierUpdate = false,
		skipBoundClamp = false,
	} = options;
	// Resolve bounds: For dynamic references (bound to another resource), always
	// use the definition bound so we re-resolve each time. For static bounds,
	// check player-specific overrides first.
	const defLower = lookup.definition.lowerBound;
	const defUpper = lookup.definition.upperBound;
	const playerLower = player.resourceLowerBounds[resourceId];
	const playerUpper = player.resourceUpperBounds[resourceId];
	// For dynamic bounds (references), always use definition to get fresh value.
	// For static bounds, player overrides take precedence.
	const lowerBoundValue = isBoundReference(defLower)
		? defLower
		: (playerLower ?? defLower);
	const upperBoundValue = isBoundReference(defUpper)
		? defUpper
		: (playerUpper ?? defUpper);
	const resolvedLower = resolveBoundValue(
		lowerBoundValue,
		player.resourceValues,
	);
	const resolvedUpper = resolveBoundValue(
		upperBoundValue,
		player.resourceValues,
	);
	const previous =
		player.resourceValues[resourceId] ??
		clampToBounds(0, resolvedLower, resolvedUpper);
	const clamped = skipBoundClamp
		? value
		: clampToBounds(value, resolvedLower, resolvedUpper);
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
	if (clamped !== 0) {
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
		// Resolve bounds - for references, use current player values
		const lower = resolveBoundValue(resource.lowerBound, player.resourceValues);
		const upper = resolveBoundValue(resource.upperBound, player.resourceValues);
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
		const lower = resolveBoundValue(
			group.parent.lowerBound,
			player.resourceValues,
		);
		const upper = resolveBoundValue(
			group.parent.upperBound,
			player.resourceValues,
		);
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
	// Get the bound value (player override or definition), then resolve
	const boundValue = previousRaw !== undefined ? previousRaw : definitionBound;
	const previousBound = resolveBoundValue(boundValue, player.resourceValues);
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
		const childIds =
			getCatalogIndexes(catalog).groupChildren[lookup.groupId] ?? [];
		const aggregate = aggregateChildValues(player, childIds);
		if (direction === 'lower') {
			if (aggregate < nextBound) {
				throw new Error(
					`ResourceV2 parent "${resourceId}" cannot raise lower bound beyond its aggregated child total of ${aggregate}.`,
				);
			}
			return { previousBound, nextBound, valueClamped: false };
		}
		applyValue(context, player, catalog, lookup, resourceId, aggregate, {
			suppressRecentEntry: true,
		});
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
