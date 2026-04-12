import type { EffectDef } from '@boardsmith/protocol';
import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';
import { recordEffectResourceDelta } from '../../resource_sources';
import { setResourceValue, getResourceValue } from '../state';
import type { RuntimeResourceCatalog } from '../types';
import {
	ResourceBoundExceededError,
	type ResolvedBounds,
	type ResourceReconciliationMode,
	type ResourceReconciliationResult,
} from '../reconciliation';
import { validateGroupParentBounds } from './group-parent-validation';

/**
 * Build a cache key for additive percent changes. Multiple percent changes
 * in the same turn/phase/step use additive accumulation from the original
 * base value rather than compounding.
 */
export function buildAdditiveCacheKey(
	context: EngineContext,
	resourceId: string,
): string {
	return (
		`${context.game.turn}:${context.game.currentPhase}:` +
		`${context.game.currentStep}:${resourceId}`
	);
}

/**
 * Apply an additive percent change using step-based caching. Multiple
 * percent changes in the same step scale from the original base value
 * rather than compounding.
 *
 * Supports per-bound reconciliation modes when specified in the bounds object.
 * Each bound (lower/upper) can have its own reconciliation mode.
 */
export function applyAdditivePercentChange(
	context: EngineContext,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	requestedDelta: number,
	bounds: ResolvedBounds,
	effect: EffectDef,
	roundingMode: 'up' | 'down' | 'nearest' | undefined,
	reconciliationMode: ResourceReconciliationMode = 'clamp',
): ResourceReconciliationResult {
	const cacheKey = buildAdditiveCacheKey(context, resourceId);
	const bases = context.resourcePercentBases;
	const accums = context.resourcePercentAccums;

	// Initialize cache on first access in this step
	if (!(cacheKey in bases)) {
		bases[cacheKey] = getResourceValue(player, resourceId);
		accums[cacheKey] = 0;
	}

	const base = bases[cacheKey]!;
	const currentAccum = accums[cacheKey]!;
	const before = getResourceValue(player, resourceId);

	// Compute tentative new value WITHOUT updating accumulator yet
	// (reject mode must not leave state modified on failure)
	const tentativeAccum = currentAccum + requestedDelta;
	let newValue = base + tentativeAccum;

	// Apply rounding
	if (roundingMode === 'up') {
		newValue = newValue >= 0 ? Math.ceil(newValue) : Math.floor(newValue);
	} else if (roundingMode === 'down') {
		newValue = newValue >= 0 ? Math.floor(newValue) : Math.ceil(newValue);
	}

	// Use resolved bound values (already numbers or null)
	const lowerBound = bounds.lowerBound;
	const upperBound = bounds.upperBound;
	let clampedToLowerBound = false;
	let clampedToUpperBound = false;

	// Determine effective mode for each bound:
	// - Use bound-level mode if specified, otherwise use effect-level mode
	const lowerMode = bounds.lowerBoundReconciliation ?? reconciliationMode;
	const upperMode = bounds.upperBoundReconciliation ?? reconciliationMode;

	// Check lower bound violation
	if (lowerBound !== null && newValue < lowerBound) {
		if (lowerMode === 'reject') {
			throw new ResourceBoundExceededError(
				'lower',
				newValue,
				lowerBound,
				requestedDelta,
			);
		} else if (lowerMode === 'clamp') {
			newValue = lowerBound;
			clampedToLowerBound = true;
		}
		// 'pass' mode: do nothing, allow violation
	}

	// Check upper bound violation
	if (upperBound !== null && newValue > upperBound) {
		if (upperMode === 'reject') {
			throw new ResourceBoundExceededError(
				'upper',
				newValue,
				upperBound,
				requestedDelta,
			);
		} else if (upperMode === 'clamp') {
			newValue = upperBound;
			clampedToUpperBound = true;
		}
		// 'pass' mode: do nothing, allow violation
	}

	// Validate group parent bounds - systematic rejection to maintain integrity
	validateGroupParentBounds(player, catalog, resourceId, newValue);

	// Only update accumulator AFTER validation passes
	accums[cacheKey] = tentativeAccum;

	// Pass mode bypasses bounds - tell setResourceValue to skip clamping
	// Use 'pass' if EITHER bound mode is 'pass' (conservative approach)
	const skipBoundClamp = lowerMode === 'pass' || upperMode === 'pass';
	setResourceValue(context, player, catalog, resourceId, newValue, {
		skipBoundClamp,
	});

	const delta = newValue - before;
	if (delta !== 0 && Array.isArray(context.resourceSourceStack)) {
		recordEffectResourceDelta(effect, context, resourceId, delta);
	}

	return {
		requestedDelta,
		appliedDelta: delta,
		finalValue: newValue,
		clampedToLowerBound,
		clampedToUpperBound,
	};
}
