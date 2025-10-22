import type { EngineContext } from '../context';
import type { PlayerState } from '../state';
import type {
	RuntimeResourceCatalog,
	RuntimeResourceDefinition,
	RuntimeResourceGroupParent,
} from './types';
import {
	assertInteger,
	clampValue,
	pruneUnknownKeys,
	readBounds,
	resolveTierForValue,
} from './state-helpers';

export type ResourceStateIndexEntryKind = 'resource' | 'groupParent';

export interface ResourceStateIndexEntry {
	readonly id: string;
	readonly kind: ResourceStateIndexEntryKind;
	readonly definition: RuntimeResourceDefinition | RuntimeResourceGroupParent;
}

export type ResourceStateIndex = ReadonlyMap<string, ResourceStateIndexEntry>;

export interface ResourceValueUpdateResult {
	readonly previousValue: number;
	readonly nextValue: number;
	readonly delta: number;
	readonly clampedToLowerBound: boolean;
	readonly clampedToUpperBound: boolean;
}

export interface SetResourceValueOptions {
	readonly clampToBounds?: boolean;
	readonly markTouched?: boolean;
	readonly updateTier?: boolean;
	readonly recordRecentGain?: boolean;
	readonly allowLimitedResource?: boolean;
}

export type ApplyResourceDeltaOptions = SetResourceValueOptions;

export interface AdjustResourceBoundOptions {
	readonly clampValue?: boolean;
	readonly markBoundTouched?: boolean;
	readonly markValueTouched?: boolean;
	readonly updateTier?: boolean;
	readonly recordRecentGain?: boolean;
}

export interface ResourceBoundAdjustmentResult {
	readonly bound: 'lower' | 'upper';
	readonly previousBound: number | null;
	readonly nextBound: number | null;
	readonly previousValue: number;
	readonly nextValue: number;
	readonly clampedValue: boolean;
}

function expectIndexEntry(
	index: ResourceStateIndex,
	resourceId: string,
): ResourceStateIndexEntry {
	const entry = index.get(resourceId);
	if (!entry) {
		throw new Error(
			`ResourceV2 state attempted to access unknown resource "${resourceId}". Ensure the runtime catalog initialised player state before any mutations.`,
		);
	}
	return entry;
}

export function createResourceStateIndex(
	catalog: RuntimeResourceCatalog,
): ResourceStateIndex {
	const entries = new Map<string, ResourceStateIndexEntry>();
	for (const resource of catalog.resources.ordered) {
		entries.set(resource.id, {
			id: resource.id,
			kind: 'resource',
			definition: resource,
		});
	}
	for (const group of catalog.groups.ordered) {
		if (group.parent) {
			entries.set(group.parent.id, {
				id: group.parent.id,
				kind: 'groupParent',
				definition: group.parent,
			});
		}
	}
	return entries;
}

export function initialisePlayerResourceState(
	player: PlayerState,
	index: ResourceStateIndex,
): void {
	const allowedIds = new Set<string>();
	for (const entry of index.values()) {
		allowedIds.add(entry.id);
	}
	pruneUnknownKeys(player.resourceValues, allowedIds);
	pruneUnknownKeys(player.resourceLowerBounds, allowedIds);
	pruneUnknownKeys(player.resourceUpperBounds, allowedIds);
	pruneUnknownKeys(player.resourceTouched, allowedIds);
	pruneUnknownKeys(player.resourceTierIds, allowedIds);
	pruneUnknownKeys(player.resourceBoundTouched, allowedIds);
	for (const entry of index.values()) {
		const { id, definition } = entry;
		const lowerBound = definition.lowerBound;
		const upperBound = definition.upperBound;
		const initialClamp = clampValue(0, lowerBound, upperBound);
		player.resourceValues[id] = initialClamp.value;
		player.resourceLowerBounds[id] = lowerBound;
		player.resourceUpperBounds[id] = upperBound;
		player.resourceTouched[id] = false;
		player.resourceTierIds[id] = resolveTierForValue(
			definition.tierTrack,
			initialClamp.value,
		);
		player.resourceBoundTouched[id] = { lower: false, upper: false };
	}
}

export function getResourceValue(
	player: PlayerState,
	resourceId: string,
): number {
	if (!(resourceId in player.resourceValues)) {
		throw new Error(
			`ResourceV2 state attempted to read value for unknown resource "${resourceId}". Initialise player state first.`,
		);
	}
	return player.resourceValues[resourceId] ?? 0;
}

export function setResourceValue(
	context: EngineContext | null,
	player: PlayerState,
	resourceId: string,
	value: number,
	index: ResourceStateIndex,
	options: SetResourceValueOptions = {},
): ResourceValueUpdateResult {
	assertInteger(value, `resource "${resourceId}" value`);
	const entry = expectIndexEntry(index, resourceId);
	if (entry.kind === 'groupParent' && options.allowLimitedResource !== true) {
		throw new Error(
			`ResourceV2 state does not allow direct mutation of limited resource "${resourceId}" without explicit opt-in.`,
		);
	}
	const previousValue = getResourceValue(player, resourceId);
	const { lowerBound, upperBound } = readBounds(player, resourceId);
	const clampToBounds = options.clampToBounds !== false;
	const clampResult = clampToBounds
		? clampValue(value, lowerBound, upperBound)
		: {
				value,
				clampedToLowerBound: false,
				clampedToUpperBound: false,
			};
	const nextValue = clampResult.value;
	player.resourceValues[resourceId] = nextValue;
	const delta = nextValue - previousValue;
	if (delta !== 0 && options.markTouched !== false) {
		player.resourceTouched[resourceId] = true;
	}
	if (options.updateTier !== false) {
		player.resourceTierIds[resourceId] = resolveTierForValue(
			entry.definition.tierTrack,
			nextValue,
		);
	}
	if (delta !== 0 && options.recordRecentGain !== false && context) {
		context.recentResourceGains.push({ key: resourceId, amount: delta });
	}
	return {
		previousValue,
		nextValue,
		delta,
		clampedToLowerBound: clampResult.clampedToLowerBound,
		clampedToUpperBound: clampResult.clampedToUpperBound,
	};
}

export function applyResourceDelta(
	context: EngineContext | null,
	player: PlayerState,
	resourceId: string,
	delta: number,
	index: ResourceStateIndex,
	options: ApplyResourceDeltaOptions = {},
): ResourceValueUpdateResult {
	assertInteger(delta, `resource "${resourceId}" delta`);
	const currentValue = getResourceValue(player, resourceId);
	return setResourceValue(
		context,
		player,
		resourceId,
		currentValue + delta,
		index,
		options,
	);
}

export function adjustResourceBound(
	context: EngineContext | null,
	player: PlayerState,
	resourceId: string,
	bound: 'lower' | 'upper',
	nextBound: number | null,
	index: ResourceStateIndex,
	options: AdjustResourceBoundOptions = {},
): ResourceBoundAdjustmentResult {
	if (nextBound !== null) {
		assertInteger(nextBound, `resource "${resourceId}" ${bound} bound`);
	}
	const entry = expectIndexEntry(index, resourceId);
	const boundsMap =
		bound === 'lower' ? player.resourceLowerBounds : player.resourceUpperBounds;
	const previousBound = boundsMap[resourceId] ?? null;
	boundsMap[resourceId] = nextBound;
	if (options.markBoundTouched !== false) {
		const touched =
			player.resourceBoundTouched[resourceId] ??
			(player.resourceBoundTouched[resourceId] = {
				lower: false,
				upper: false,
			});
		touched[bound] = true;
	}
	const previousValue = getResourceValue(player, resourceId);
	let nextValue = previousValue;
	let clampedValue = false;
	if (options.clampValue !== false) {
		const { lowerBound, upperBound } = readBounds(player, resourceId);
		const clampResult = clampValue(previousValue, lowerBound, upperBound);
		if (clampResult.value !== previousValue) {
			clampedValue = true;
			const setResult = setResourceValue(
				context,
				player,
				resourceId,
				clampResult.value,
				index,
				{
					clampToBounds: false,
					markTouched: options.markValueTouched !== false,
					updateTier: options.updateTier !== false,
					recordRecentGain: options.recordRecentGain !== false,
					allowLimitedResource: entry.kind === 'groupParent',
				},
			);
			nextValue = setResult.nextValue;
		} else if (options.updateTier !== false) {
			player.resourceTierIds[resourceId] = resolveTierForValue(
				entry.definition.tierTrack,
				previousValue,
			);
		}
	} else if (options.updateTier !== false) {
		player.resourceTierIds[resourceId] = resolveTierForValue(
			entry.definition.tierTrack,
			previousValue,
		);
	}
	return {
		bound,
		previousBound,
		nextBound,
		previousValue,
		nextValue,
		clampedValue,
	};
}
