import type {
	ReconciliationStrategy,
	ResourceReconciliationInput,
	ResourceReconciliationMode,
	ResourceReconciliationResult,
} from './types';
import { computeRequestedResourceDelta } from './delta';
import { clampStrategy, passStrategy, rejectStrategy } from './strategies';

// Re-export delta computation utility
export { computeRequestedResourceDelta } from './delta';

// Re-export error class from types
export { ResourceBoundExceededError } from './types';
export type {
	ComputeResourceDeltaInput,
	ReconciliationStrategy,
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
 * Selects and applies the appropriate reconciliation strategy based on the
 * specified mode.
 */
export function reconcileResourceChange(
	input: ResourceReconciliationInput,
): ResourceReconciliationResult {
	const { currentValue, bounds, reconciliationMode } = input;

	const requestedDelta = computeRequestedResourceDelta(input);
	const targetValue = currentValue + requestedDelta;

	const strategy = STRATEGY_MAP[reconciliationMode];
	if (!strategy) {
		throw new Error(
			`Unknown reconciliation mode: "${reconciliationMode}". ` +
				`Valid modes: ${Object.keys(STRATEGY_MAP).join(', ')}.`,
		);
	}

	return strategy(currentValue, targetValue, requestedDelta, bounds);
}
