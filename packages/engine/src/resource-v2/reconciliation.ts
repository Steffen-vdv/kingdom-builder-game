import type { RuntimeResourceBounds } from './types';

export type ResourceReconciliationMode = 'clamp' | 'pass' | 'reject';

export type ResourceChangeRoundingMode = 'up' | 'down' | 'nearest';

export interface ResourceAmountChangeParameters {
	readonly type: 'amount';
	readonly amount: number;
}

export interface ResourcePercentChangeParameters {
	readonly type: 'percent';
	readonly modifiers: readonly number[];
	readonly roundingMode?: ResourceChangeRoundingMode;
}

export type ResourceChangeParameters =
	| ResourceAmountChangeParameters
	| ResourcePercentChangeParameters;

export interface ComputeResourceDeltaInput {
	readonly currentValue: number;
	readonly change: ResourceChangeParameters;
}

export interface ResourceReconciliationInput extends ComputeResourceDeltaInput {
	readonly bounds?: RuntimeResourceBounds | null;
	readonly reconciliationMode: ResourceReconciliationMode;
}

export interface ResourceReconciliationResult {
	readonly requestedDelta: number;
	readonly appliedDelta: number;
	readonly finalValue: number;
	readonly clampedToLowerBound: boolean;
	readonly clampedToUpperBound: boolean;
}

const DEFAULT_PERCENT_ROUNDING_MODE: ResourceChangeRoundingMode = 'nearest';

function roundValue(value: number, mode: ResourceChangeRoundingMode): number {
	switch (mode) {
		case 'up': {
			return Math.ceil(value);
		}
		case 'down': {
			return Math.floor(value);
		}
		case 'nearest': {
			return Math.round(value);
		}
		default: {
			return Math.round(value);
		}
	}
}

export function computeRequestedResourceDelta(
	input: ComputeResourceDeltaInput,
): number {
	const { currentValue, change } = input;

	if (change.type === 'amount') {
		return change.amount;
	}

	const percentChange =
		change.modifiers.reduce((total, modifier) => total + modifier, 0) *
		currentValue;

	const roundingMode = change.roundingMode ?? DEFAULT_PERCENT_ROUNDING_MODE;

	return roundValue(percentChange, roundingMode);
}

function clampValue(
	currentValue: number,
	targetValue: number,
	bounds: RuntimeResourceBounds | null | undefined,
): {
	finalValue: number;
	clampedToLowerBound: boolean;
	clampedToUpperBound: boolean;
} {
	const lowerBound = bounds?.lowerBound ?? null;
	const upperBound = bounds?.upperBound ?? null;

	let finalValue = targetValue;
	let clampedToLowerBound = false;
	let clampedToUpperBound = false;

	if (lowerBound !== null && finalValue < lowerBound) {
		finalValue = lowerBound;
		clampedToLowerBound = true;
	}

	if (upperBound !== null && finalValue > upperBound) {
		finalValue = upperBound;
		clampedToUpperBound = true;
	}

	return { finalValue, clampedToLowerBound, clampedToUpperBound };
}

export function reconcileResourceChange(
	input: ResourceReconciliationInput,
): ResourceReconciliationResult {
	const { currentValue, bounds, reconciliationMode } = input;

	const requestedDelta = computeRequestedResourceDelta(input);
	const targetValue = currentValue + requestedDelta;

	if (reconciliationMode !== 'clamp') {
		throw new Error(
			`Reconciliation mode "${reconciliationMode}" is not supported yet.`,
		);
	}

	const { finalValue, clampedToLowerBound, clampedToUpperBound } = clampValue(
		currentValue,
		targetValue,
		bounds,
	);

	const appliedDelta = finalValue - currentValue;

	return {
		requestedDelta,
		appliedDelta,
		finalValue,
		clampedToLowerBound,
		clampedToUpperBound,
	};
}
