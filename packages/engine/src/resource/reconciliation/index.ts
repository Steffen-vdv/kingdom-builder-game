import type {
	ReconciliationStrategy,
	ResolvedBounds,
	ResourceReconciliationInput,
	ResourceReconciliationMode,
	ResourceReconciliationResult,
} from './types';
import { ResourceBoundExceededError } from './types';
import { computeRequestedResourceDelta } from './delta';
import { clampStrategy, passStrategy, rejectStrategy } from './strategies';

// Re-export delta computation utility
export { computeRequestedResourceDelta } from './delta';

// Re-export error class and constants from types
export {
	ResourceBoundExceededError,
	ReconciliationMode,
	RoundingMode,
	VALID_RECONCILIATION_MODES,
	VALID_ROUNDING_MODES,
} from './types';
export type {
	ComputeResourceDeltaInput,
	ReconciliationStrategy,
	ResolvedBounds,
	ResourceAmountChangeParameters,
	ResourceChangeParameters,
	ResourceChangeRoundingMode,
	ResourcePercentChangeParameters,
	ResourcePercentFromResourceParameters,
	ResourceReconciliationInput,
	ResourceReconciliationMode,
	ResourceReconciliationResult,
} from './types';

// Re-export strategies for direct access if needed
export { clampStrategy, passStrategy, rejectStrategy } from './strategies';

const STRATEGY_MAP: Record<ResourceReconciliationMode, ReconciliationStrategy> =
	{
		clamp: clampStrategy,
		pass: passStrategy,
		reject: rejectStrategy,
	};

/**
 * Applies per-bound reconciliation with support for different modes per bound.
 *
 * Priority for reconciliation mode:
 * 1. Bound-level mode (from resource definition)
 * 2. Effect-level mode (from the effect params)
 * 3. Default to 'clamp'
 *
 * This allows resources to define how their bounds should be enforced
 * independently of what effects request.
 */
function applyPerBoundReconciliation(
	currentValue: number,
	targetValue: number,
	requestedDelta: number,
	bounds: ResolvedBounds | null | undefined,
	effectReconciliationMode: ResourceReconciliationMode,
): ResourceReconciliationResult {
	const lowerBound = bounds?.lowerBound ?? null;
	const upperBound = bounds?.upperBound ?? null;

	// Determine effective mode for each bound:
	// - Use bound-level mode if specified, otherwise use effect-level mode
	const lowerMode =
		bounds?.lowerBoundReconciliation ?? effectReconciliationMode;
	const upperMode =
		bounds?.upperBoundReconciliation ?? effectReconciliationMode;

	let finalValue = targetValue;
	let clampedToLowerBound = false;
	let clampedToUpperBound = false;

	// Check lower bound violation
	if (lowerBound !== null && finalValue < lowerBound) {
		if (lowerMode === 'reject') {
			throw new ResourceBoundExceededError(
				'lower',
				finalValue,
				lowerBound,
				requestedDelta,
			);
		} else if (lowerMode === 'clamp') {
			finalValue = lowerBound;
			clampedToLowerBound = true;
		}
		// 'pass' mode: do nothing, allow violation
	}

	// Check upper bound violation
	if (upperBound !== null && finalValue > upperBound) {
		if (upperMode === 'reject') {
			throw new ResourceBoundExceededError(
				'upper',
				finalValue,
				upperBound,
				requestedDelta,
			);
		} else if (upperMode === 'clamp') {
			finalValue = upperBound;
			clampedToUpperBound = true;
		}
		// 'pass' mode: do nothing, allow violation
	}

	const appliedDelta = finalValue - currentValue;
	return {
		requestedDelta,
		appliedDelta,
		finalValue,
		clampedToLowerBound,
		clampedToUpperBound,
	};
}

/**
 * Selects and applies the appropriate reconciliation strategy based on the
 * specified mode. Supports per-bound reconciliation modes when specified in
 * the bounds object.
 */
export function reconcileResourceChange(
	input: ResourceReconciliationInput,
): ResourceReconciliationResult {
	const { currentValue, bounds, reconciliationMode } = input;

	const requestedDelta = computeRequestedResourceDelta(input);
	const targetValue = currentValue + requestedDelta;

	// Check if per-bound reconciliation modes are specified
	const hasPerBoundModes =
		bounds?.lowerBoundReconciliation !== undefined ||
		bounds?.upperBoundReconciliation !== undefined;

	if (hasPerBoundModes) {
		// Use the new per-bound reconciliation logic
		return applyPerBoundReconciliation(
			currentValue,
			targetValue,
			requestedDelta,
			bounds,
			reconciliationMode,
		);
	}

	// Fall back to the original single-mode strategy
	const strategy = STRATEGY_MAP[reconciliationMode];
	if (!strategy) {
		throw new Error(
			`Unknown reconciliation mode: "${reconciliationMode}". ` +
				`Valid modes: ${Object.keys(STRATEGY_MAP).join(', ')}.`,
		);
	}

	return strategy(currentValue, targetValue, requestedDelta, bounds);
}
