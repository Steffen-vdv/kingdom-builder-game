import type { PlayerState } from '../state';
import type {
	RuntimeResourceCatalog,
	RuntimeResourceDefinition,
	RuntimeResourceGroupParent,
} from './types';

export type RuntimeResourceStateDefinition =
	| RuntimeResourceDefinition
	| RuntimeResourceGroupParent;

export interface ResourceTierChangeResult {
	readonly previousTierId: string | null;
	readonly nextTierId: string | null;
	readonly changed: boolean;
}

export function assertFiniteInteger(value: number, context: string): void {
	if (!Number.isFinite(value) || !Number.isInteger(value)) {
		throw new Error(`${context} must be a finite integer.`);
	}
}

export function clampToBounds(
	value: number,
	lower: number | null,
	upper: number | null,
): { value: number; clamped: boolean } {
	let next = value;
	if (lower !== null && next < lower) {
		next = lower;
	}
	if (upper !== null && next > upper) {
		next = upper;
	}
	return { value: next, clamped: next !== value };
}

function resolveTierForValue(
	definition: RuntimeResourceStateDefinition,
	value: number,
): string | null {
	const track = definition.tierTrack;
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

export function updateTierState(
	player: PlayerState,
	definition: RuntimeResourceStateDefinition,
	nextValue: number,
): ResourceTierChangeResult {
	const id = definition.id;
	const previousTierId = player.resourceTierIds[id] ?? null;
	const nextTierId = resolveTierForValue(definition, nextValue);
	if (previousTierId === nextTierId) {
		return {
			previousTierId,
			nextTierId,
			changed: false,
		};
	}
	player.resourceTierIds[id] = nextTierId;
	return {
		previousTierId,
		nextTierId,
		changed: true,
	};
}

export function ensureResourceSlot(
	player: PlayerState,
	resourceId: string,
): void {
	if (
		!Object.prototype.hasOwnProperty.call(player.resourceValues, resourceId)
	) {
		throw new Error(
			`ResourceV2 state for "${resourceId}" has not been initialised on player "${player.id}".`,
		);
	}
}

export function readBound(
	record: Record<string, number | null>,
	resourceId: string,
): number | null {
	const value = record[resourceId];
	return typeof value === 'number' ? value : null;
}

export function resetRecord(record: Record<string, unknown>): void {
	for (const key of Object.keys(record)) {
		delete record[key];
	}
}

export function collectDefinitions(
	catalog: RuntimeResourceCatalog,
): RuntimeResourceStateDefinition[] {
	const definitions: RuntimeResourceStateDefinition[] = [
		...catalog.resources.ordered,
	];
	for (const group of catalog.groups.ordered) {
		if (group.parent) {
			definitions.push(group.parent);
		}
	}
	return definitions;
}

export function seedDefinition(
	player: PlayerState,
	definition: RuntimeResourceStateDefinition,
	initialValues: Readonly<Record<string, number>>,
): void {
	const id = definition.id;
	const hasInitialValue = Object.prototype.hasOwnProperty.call(
		initialValues,
		id,
	);
	const rawInitial = hasInitialValue
		? initialValues[id]!
		: (definition.lowerBound ?? 0);
	assertFiniteInteger(rawInitial, `Initial value for ResourceV2 "${id}"`);
	const lowerBound = definition.lowerBound ?? null;
	const upperBound = definition.upperBound ?? null;
	player.resourceLowerBounds[id] = lowerBound;
	player.resourceUpperBounds[id] = upperBound;
	const { value: initialValue } = clampToBounds(
		rawInitial,
		lowerBound,
		upperBound,
	);
	player.resourceValues[id] = initialValue;
	player.resourceTouched[id] = false;
	player.resourceTierIds[id] = resolveTierForValue(definition, initialValue);
	player.resourceBoundTouched[id] = { lower: false, upper: false };
}
