import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';
import { recordEffectResourceDelta } from '../../resource_sources';
import { setResourceValue, getResourceValue } from '../state';
import type { RuntimeResourceCatalog, RuntimeResourceBounds } from '../types';
import type { ResourceReconciliationResult } from '../reconciliation';

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
	const before = getResourceValue(player, resourceId);

	// Accumulate the delta from the original base
	accums[cacheKey]! += requestedDelta;

	// Compute new value from base + accumulated delta
	let newValue = base + accums[cacheKey]!;

	// Apply rounding
	if (roundingMode === 'up') {
		newValue = newValue >= 0 ? Math.ceil(newValue) : Math.floor(newValue);
	} else if (roundingMode === 'down') {
		newValue = newValue >= 0 ? Math.floor(newValue) : Math.ceil(newValue);
	}

	// Apply bounds
	const lowerBound = bounds.lowerBound;
	const upperBound = bounds.upperBound;
	let clampedToLowerBound = false;
	let clampedToUpperBound = false;

	if (lowerBound !== null && newValue < lowerBound) {
		newValue = lowerBound;
		clampedToLowerBound = true;
	}
	if (upperBound !== null && newValue > upperBound) {
		newValue = upperBound;
		clampedToUpperBound = true;
	}

	setResourceValue(context, player, catalog, resourceId, newValue);

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
