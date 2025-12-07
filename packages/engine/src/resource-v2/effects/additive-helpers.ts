import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';
import { recordEffectResourceDelta } from '../../resource_sources';
import { setResourceValue, getResourceValue } from '../state';
import type { RuntimeResourceCatalog, RuntimeResourceBounds } from '../types';
import {
	ResourceBoundExceededError,
	type ResourceReconciliationMode,
	type ResourceReconciliationResult,
} from '../reconciliation';

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
 */
export function applyAdditivePercentChange(
	context: EngineContext,
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	requestedDelta: number,
	bounds: RuntimeResourceBounds,
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

	// Apply reconciliation based on mode
	const lowerBound = bounds.lowerBound;
	const upperBound = bounds.upperBound;
	let clampedToLowerBound = false;
	let clampedToUpperBound = false;

	if (reconciliationMode === 'reject') {
		// Reject mode: throw error if bounds would be exceeded
		// NOTE: We throw BEFORE updating the accumulator so state is untouched
		if (lowerBound !== null && newValue < lowerBound) {
			throw new ResourceBoundExceededError(
				'lower',
				newValue,
				lowerBound,
				requestedDelta,
			);
		}
		if (upperBound !== null && newValue > upperBound) {
			throw new ResourceBoundExceededError(
				'upper',
				newValue,
				upperBound,
				requestedDelta,
			);
		}
	} else if (reconciliationMode === 'clamp') {
		// Clamp mode: constrain to bounds
		if (lowerBound !== null && newValue < lowerBound) {
			newValue = lowerBound;
			clampedToLowerBound = true;
		}
		if (upperBound !== null && newValue > upperBound) {
			newValue = upperBound;
			clampedToUpperBound = true;
		}
	}
	// Pass mode: no bounds checking, value passes through as-is

	// Only update accumulator AFTER validation passes
	accums[cacheKey] = tentativeAccum;

	// Pass mode bypasses bounds - tell setResourceValue to skip clamping
	const skipBoundClamp = reconciliationMode === 'pass';
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
