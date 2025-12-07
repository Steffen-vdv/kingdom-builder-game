import type {
	ReconciliationStrategy,
	ResourceReconciliationResult,
} from '../types';

/**
 * Pass strategy: bypasses bounds entirely and applies the full requested delta.
 * The value is allowed to exceed bounds, which may trigger other game mechanics
 * (e.g., bankruptcy tiers, anarchy effects) later in the game flow.
 */
export const passStrategy: ReconciliationStrategy = (
	_currentValue: number,
	targetValue: number,
	requestedDelta: number,
): ResourceReconciliationResult => {
	return {
		requestedDelta,
		appliedDelta: requestedDelta,
		finalValue: targetValue,
		clampedToLowerBound: false,
		clampedToUpperBound: false,
	};
};
