import type { EngineContext } from '../context';
import type { PlayerState } from '../state';
import type { RuntimeResourceCatalog } from './types';
import {
	assertFiniteInteger,
	clampToBounds,
	collectDefinitions,
	ensureResourceSlot,
	readBound,
	resetRecord,
	seedDefinition,
	updateTierState,
	type ResourceTierChangeResult,
	type RuntimeResourceStateDefinition,
} from './state.helpers';

export type ResourceChangeContext = Pick<EngineContext, 'recentResourceGains'>;

export interface ResourceValueWriteOptions {
	readonly recordRecentGain?: boolean;
	readonly markTouched?: boolean;
}

export interface ResourceValueChangeResult {
	readonly resourceId: string;
	readonly previousValue: number;
	readonly nextValue: number;
	readonly appliedDelta: number;
	readonly clamped: boolean;
	readonly tierChange: ResourceTierChangeResult;
}

export interface ResourceBoundAdjustmentResult {
	readonly resourceId: string;
	readonly previousBound: number | null;
	readonly nextBound: number | null;
	readonly changed: boolean;
	readonly valueChange: ResourceValueChangeResult | null;
}

export function initialisePlayerResourceState(
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	initialValues: Readonly<Record<string, number>> = {},
): void {
	const definitions = collectDefinitions(catalog);
	const knownIds = new Set(definitions.map((definition) => definition.id));
	for (const key of Object.keys(initialValues)) {
		if (!knownIds.has(key)) {
			throw new Error(
				`Initial ResourceV2 value provided for unknown resource "${key}".`,
			);
		}
	}
	resetRecord(player.resourceValues as Record<string, unknown>);
	resetRecord(player.resourceLowerBounds as Record<string, unknown>);
	resetRecord(player.resourceUpperBounds as Record<string, unknown>);
	resetRecord(player.resourceTouched as Record<string, unknown>);
	resetRecord(player.resourceTierIds as Record<string, unknown>);
	resetRecord(player.resourceBoundTouched as Record<string, unknown>);
	for (const definition of definitions) {
		seedDefinition(player, definition, initialValues);
	}
}

export function getResourceValue(
	player: PlayerState,
	resourceId: string,
): number {
	ensureResourceSlot(player, resourceId);
	return player.resourceValues[resourceId] ?? 0;
}

export function getResourceBounds(
	player: PlayerState,
	resourceId: string,
): { lower: number | null; upper: number | null } {
	ensureResourceSlot(player, resourceId);
	return {
		lower: readBound(player.resourceLowerBounds, resourceId),
		upper: readBound(player.resourceUpperBounds, resourceId),
	};
}

export function setResourceValue(
	engineContext: ResourceChangeContext | undefined,
	player: PlayerState,
	definition: RuntimeResourceStateDefinition,
	targetValue: number,
	options: ResourceValueWriteOptions = {},
): ResourceValueChangeResult {
	const id = definition.id;
	ensureResourceSlot(player, id);
	assertFiniteInteger(targetValue, `ResourceV2 value for "${id}"`);
	const previousValue = player.resourceValues[id] ?? 0;
	const lowerBound = readBound(player.resourceLowerBounds, id);
	const upperBound = readBound(player.resourceUpperBounds, id);
	const { value: clampedValue, clamped } = clampToBounds(
		targetValue,
		lowerBound,
		upperBound,
	);
	player.resourceValues[id] = clampedValue;
	const appliedDelta = clampedValue - previousValue;
	const tierChange = updateTierState(player, definition, clampedValue);
	if (appliedDelta !== 0 && options.markTouched !== false) {
		player.resourceTouched[id] = true;
	}
	if (
		engineContext &&
		options.recordRecentGain !== false &&
		appliedDelta !== 0
	) {
		engineContext.recentResourceGains.push({ key: id, amount: appliedDelta });
	}
	return {
		resourceId: id,
		previousValue,
		nextValue: clampedValue,
		appliedDelta,
		clamped,
		tierChange,
	};
}

export function applyResourceDelta(
	engineContext: ResourceChangeContext | undefined,
	player: PlayerState,
	definition: RuntimeResourceStateDefinition,
	delta: number,
	options: ResourceValueWriteOptions = {},
): ResourceValueChangeResult {
	if (delta === 0) {
		const id = definition.id;
		ensureResourceSlot(player, id);
		return {
			resourceId: id,
			previousValue: player.resourceValues[id] ?? 0,
			nextValue: player.resourceValues[id] ?? 0,
			appliedDelta: 0,
			clamped: false,
			tierChange: {
				previousTierId: player.resourceTierIds[id] ?? null,
				nextTierId: player.resourceTierIds[id] ?? null,
				changed: false,
			},
		};
	}
	assertFiniteInteger(delta, `ResourceV2 delta for "${definition.id}"`);
	const currentValue = getResourceValue(player, definition.id);
	return setResourceValue(
		engineContext,
		player,
		definition,
		currentValue + delta,
		options,
	);
}

function adjustBound(
	engineContext: ResourceChangeContext | undefined,
	player: PlayerState,
	definition: RuntimeResourceStateDefinition,
	delta: number,
	direction: 'lower' | 'upper',
): ResourceBoundAdjustmentResult {
	assertFiniteInteger(
		delta,
		`ResourceV2 ${direction} bound delta for "${definition.id}"`,
	);
	if (delta < 0) {
		throw new Error(
			`ResourceV2 ${direction} bound adjustments do not support decreases during MVP. Received ${delta}.`,
		);
	}
	const id = definition.id;
	ensureResourceSlot(player, id);
	const targetRecord =
		direction === 'lower'
			? player.resourceLowerBounds
			: player.resourceUpperBounds;
	const previousBoundValue = readBound(targetRecord, id);
	if (delta === 0) {
		return {
			resourceId: id,
			previousBound: previousBoundValue,
			nextBound: previousBoundValue,
			changed: false,
			valueChange: null,
		};
	}
	const base = previousBoundValue ?? 0;
	const nextBoundValue = base + delta;
	targetRecord[id] = nextBoundValue;
	const touchedEntry = player.resourceBoundTouched[id] ?? {
		lower: false,
		upper: false,
	};
	touchedEntry[direction] = true;
	player.resourceBoundTouched[id] = touchedEntry;
	const valueChange = setResourceValue(
		engineContext,
		player,
		definition,
		player.resourceValues[id] ?? 0,
		{},
	);
	return {
		resourceId: id,
		previousBound: previousBoundValue,
		nextBound: nextBoundValue,
		changed: nextBoundValue !== previousBoundValue,
		valueChange,
	};
}

export function increaseLowerBound(
	engineContext: ResourceChangeContext | undefined,
	player: PlayerState,
	definition: RuntimeResourceStateDefinition,
	delta: number,
): ResourceBoundAdjustmentResult {
	return adjustBound(engineContext, player, definition, delta, 'lower');
}

export function increaseUpperBound(
	engineContext: ResourceChangeContext | undefined,
	player: PlayerState,
	definition: RuntimeResourceStateDefinition,
	delta: number,
): ResourceBoundAdjustmentResult {
	return adjustBound(engineContext, player, definition, delta, 'upper');
}
