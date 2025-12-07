import type { RuntimeResourceBounds } from '../../types';
import type {
	ReconciliationStrategy,
	ResourceReconciliationResult,
} from '../types';
import { ResourceBoundExceededError } from '../types';

/**
 * Reject strategy: throws an error if the target value would exceed bounds.
 * Used during action simulation to prevent invalid state from being applied.
 * This is particularly useful for system actions like initial setup where
 * exceeding bounds indicates a configuration error.
 */
export const rejectStrategy: ReconciliationStrategy = (
	_currentValue: number,
	targetValue: number,
	requestedDelta: number,
	bounds: RuntimeResourceBounds | null | undefined,
): ResourceReconciliationResult => {
	const lowerBound = bounds?.lowerBound ?? null;
	const upperBound = bounds?.upperBound ?? null;

	if (lowerBound !== null && targetValue < lowerBound) {
		throw new ResourceBoundExceededError(
			'lower',
			targetValue,
			lowerBound,
			requestedDelta,
		);
	}

	if (upperBound !== null && targetValue > upperBound) {
		throw new ResourceBoundExceededError(
			'upper',
			targetValue,
			upperBound,
			requestedDelta,
		);
	}

	// No bounds exceeded, apply the full delta
	return {
		requestedDelta,
		appliedDelta: requestedDelta,
		finalValue: targetValue,
		clampedToLowerBound: false,
		clampedToUpperBound: false,
	};
};
