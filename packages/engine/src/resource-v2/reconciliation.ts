import type { RuntimeResourceBounds } from './types';

export type ResourceReconciliationMode = 'clamp' | 'pass' | 'reject';

export type ResourceChangeRoundingMode = 'up' | 'down' | 'nearest';

export interface ResourceAmountChangeParameters {
	readonly type: 'amount';
	readonly amount: number;
	readonly roundingMode?: ResourceChangeRoundingMode;
}

export interface ResourcePercentChangeParameters {
	readonly type: 'percent';
	readonly modifiers: readonly number[];
	readonly roundingMode?: ResourceChangeRoundingMode;
	/**
	 * When additive is true, multiple changes in the same step are applied
	 * additively from the original base value rather than compounding.
	 */
	readonly additive?: boolean;
}

/**
 * Percent change that reads the percent value from another resource.
 * Used for growth mechanics where stat A increases by stat B percent.
 * When additive is true, multiple changes in the same step are applied
 * additively from the original base value rather than compounding.
 */
export interface ResourcePercentFromResourceParameters {
	readonly type: 'percentFromResource';
	readonly sourceResourceId: string;
	readonly roundingMode?: ResourceChangeRoundingMode;
	readonly additive?: boolean;
	/**
	 * Multiplier applied to the percent change, typically from evaluators
	 * that run the effect multiple times.
	 */
	readonly multiplier?: number;
}

export type ResourceChangeParameters =
	| ResourceAmountChangeParameters
	| ResourcePercentChangeParameters
	| ResourcePercentFromResourceParameters;

export interface ComputeResourceDeltaInput {
	readonly currentValue: number;
	readonly change: ResourceChangeParameters;
	/** For percentFromResource, provides access to other resource values */
	readonly getResourceValue?: (resourceId: string) => number;
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
	const { currentValue, change, getResourceValue } = input;

	if (change.type === 'amount') {
		if (change.roundingMode) {
			return roundValue(change.amount, change.roundingMode);
		}
		return change.amount;
	}

	if (change.type === 'percent') {
		const percentChange =
			change.modifiers.reduce((total, modifier) => total + modifier, 0) *
			currentValue;
		const roundingMode = change.roundingMode ?? DEFAULT_PERCENT_ROUNDING_MODE;
		return roundValue(percentChange, roundingMode);
	}

	// percentFromResource: get percent value from another resource
	if (!getResourceValue) {
		throw new Error(
			'percentFromResource change requires getResourceValue provider',
		);
	}
	const percent = getResourceValue(change.sourceResourceId) || 0;
	const multiplier = change.multiplier ?? 1;
	const percentChange = percent * currentValue * multiplier;
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
