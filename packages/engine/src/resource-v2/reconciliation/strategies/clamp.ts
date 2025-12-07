import type {
	ReconciliationStrategy,
	ResolvedBounds,
	ResourceReconciliationResult,
} from '../types';

/**
 * Clamp strategy: constrains the final value within the resource's bounds.
 * This is the default reconciliation mode.
 * Bounds must be resolved to numeric values before calling this strategy.
 */
export const clampStrategy: ReconciliationStrategy = (
	currentValue: number,
	targetValue: number,
	requestedDelta: number,
	bounds: ResolvedBounds | null | undefined,
): ResourceReconciliationResult => {
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

	const appliedDelta = finalValue - currentValue;

	return {
		requestedDelta,
		appliedDelta,
		finalValue,
		clampedToLowerBound,
		clampedToUpperBound,
	};
};
