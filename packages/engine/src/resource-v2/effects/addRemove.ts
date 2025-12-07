import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';
import { recordEffectResourceDelta } from '../../resource_sources';
import { setResourceValue, getResourceValue } from '../state';
import { ensureBoundFlags, resolveResourceDefinition } from '../state-helpers';
import {
	reconcileResourceChange,
	type ResourceChangeParameters,
	type ResourceReconciliationMode,
	type ResourceReconciliationResult,
} from '../reconciliation';
import type { RuntimeResourceCatalog, RuntimeResourceBounds } from '../types';
import {
	applyAdditivePercentChange,
	buildAdditiveCacheKey,
} from './additive-helpers';

interface BaseResourceEffectParams extends Record<string, unknown> {
	/**
	 * Identifier of the ResourceV2 entry this effect mutates.
	 */
	readonly resourceId: string;
	/**
	 * Clamp/Pass/Reject reconciliation strategy.
	 * MVP handlers only support `clamp`.
	 */
	readonly reconciliation?: ResourceReconciliationMode;
	/**
	 * When true, skips downstream hook emission (tier checks, win conditions,
	 * population triggers). Use to prevent recursive effects during batch
	 * operations.
	 */
	readonly suppressHooks?: boolean;
}

interface AmountResourceEffectParams extends BaseResourceEffectParams {
	readonly change: Extract<ResourceChangeParameters, { type: 'amount' }>;
}

interface PercentResourceEffectParams extends BaseResourceEffectParams {
	readonly change: Extract<ResourceChangeParameters, { type: 'percent' }>;
}

interface PercentFromResourceEffectParams extends BaseResourceEffectParams {
	readonly change: Extract<
		ResourceChangeParameters,
		{ type: 'percentFromResource' }
	>;
}

export type ResourceEffectParams =
	| AmountResourceEffectParams
	| PercentResourceEffectParams
	| PercentFromResourceEffectParams;

type ResourceEffectHandler = (
	effect: EffectDef<ResourceEffectParams>,
	context: EngineContext,
	multiplier?: number,
) => ResourceReconciliationResult;

const DEFAULT_RECONCILIATION_MODE: ResourceReconciliationMode = 'clamp';

type ResourceEffectKind = 'add' | 'remove';

function expectRuntimeCatalog(context: EngineContext): RuntimeResourceCatalog {
	return context.resourceCatalogV2;
}

function normaliseChange(
	change: ResourceChangeParameters,
): ResourceChangeParameters {
	if (change.type === 'amount') {
		const amount = change.amount;
		if (!Number.isFinite(amount)) {
			throw new Error(
				`ResourceV2 effect expected numeric amount change but received ${amount}.`,
			);
		}
		return {
			type: 'amount',
			amount,
			...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
		};
	}
	if (change.type === 'percentFromResource') {
		if (
			typeof change.sourceResourceId !== 'string' ||
			!change.sourceResourceId.length
		) {
			throw new Error(
				'ResourceV2 percentFromResource change requires a non-empty ' +
					'sourceResourceId.',
			);
		}
		return {
			type: 'percentFromResource',
			sourceResourceId: change.sourceResourceId,
			...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
			...(change.additive !== undefined ? { additive: change.additive } : {}),
		};
	}
	const modifiers = change.modifiers.map((modifier) => {
		if (!Number.isFinite(modifier)) {
			throw new Error(
				`ResourceV2 effect expected numeric percent modifier but received ${modifier}.`,
			);
		}
		return modifier;
	});
	return {
		type: 'percent',
		modifiers,
		...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
		...(change.additive !== undefined ? { additive: change.additive } : {}),
	};
}

function scaleChange(
	change: ResourceChangeParameters,
	multiplier: number,
): ResourceChangeParameters {
	if (multiplier === 1) {
		return change;
	}
	if (change.type === 'amount') {
		return {
			type: 'amount',
			amount: change.amount * multiplier,
			...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
		};
	}
	if (change.type === 'percentFromResource') {
		// percentFromResource scaling is handled in reconciliation via
		// the multiplier parameter, not by modifying the change itself.
		// The multiplier affects how many times the percent is applied.
		return {
			type: 'percentFromResource',
			sourceResourceId: change.sourceResourceId,
			multiplier,
			...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
			...(change.additive !== undefined ? { additive: change.additive } : {}),
		};
	}
	return {
		type: 'percent',
		modifiers: change.modifiers.map((modifier) => modifier * multiplier),
		...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
		...(change.additive !== undefined ? { additive: change.additive } : {}),
	};
}

function applySign(
	change: ResourceChangeParameters,
	kind: ResourceEffectKind,
): ResourceChangeParameters {
	if (kind === 'add') {
		return change;
	}
	if (change.type === 'amount') {
		return {
			type: 'amount',
			amount: -change.amount,
			...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
		};
	}
	if (change.type === 'percentFromResource') {
		// For remove, we negate via a negative multiplier
		const currentMult = change.multiplier ?? 1;
		return {
			type: 'percentFromResource',
			sourceResourceId: change.sourceResourceId,
			multiplier: -currentMult,
			...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
			...(change.additive !== undefined ? { additive: change.additive } : {}),
		};
	}
	return {
		type: 'percent',
		modifiers: change.modifiers.map((modifier) => -modifier),
		...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
		...(change.additive !== undefined ? { additive: change.additive } : {}),
	};
}

function resolveEffectiveBounds(
	player: PlayerState,
	resourceId: string,
	definitionBounds: RuntimeResourceBounds,
): RuntimeResourceBounds {
	const lowerOverride = player.resourceLowerBounds[resourceId];
	const upperOverride = player.resourceUpperBounds[resourceId];
	return {
		lowerBound:
			typeof lowerOverride === 'number'
				? lowerOverride
				: (definitionBounds.lowerBound ?? null),
		upperBound:
			typeof upperOverride === 'number'
				? upperOverride
				: (definitionBounds.upperBound ?? null),
	};
}

function applyResourceEffect(
	kind: ResourceEffectKind,
	effect: EffectDef<ResourceEffectParams>,
	context: EngineContext,
	multiplier = 1,
): ResourceReconciliationResult {
	const params = effect.params;
	if (!params) {
		throw new Error('ResourceV2 effect is missing required params.');
	}
	const {
		resourceId,
		change: rawChange,
		reconciliation,
		suppressHooks,
	} = params;

	if (typeof resourceId !== 'string' || !resourceId.length) {
		throw new Error(
			`ResourceV2 effect expected a non-empty resourceId. Received: ${JSON.stringify(params)}`,
		);
	}
	const catalog = expectRuntimeCatalog(context);
	const definitionLookup = resolveResourceDefinition(catalog, resourceId);
	if (!definitionLookup) {
		throw new Error(
			`ResourceV2 effect referenced unknown resource "${resourceId}".`,
		);
	}
	if (definitionLookup.kind !== 'resource') {
		throw new Error(
			`ResourceV2 effect cannot mutate group parent "${resourceId}"; parent values are derived from children.`,
		);
	}
	const player = context.activePlayer;
	const change = applySign(
		scaleChange(normaliseChange(rawChange), multiplier),
		kind,
	);
	const bounds = resolveEffectiveBounds(
		player,
		resourceId,
		definitionLookup.definition,
	);
	const reconciliationMode = reconciliation ?? DEFAULT_RECONCILIATION_MODE;
	const currentValue = getResourceValue(player, resourceId);

	// Create getResourceValue callback for percentFromResource changes
	const getResourceValueFn = (id: string) => getResourceValue(player, id);

	// Handle additive percent changes with step-based caching
	const isAdditivePercent =
		(change.type === 'percentFromResource' && change.additive) ||
		(change.type === 'percent' && change.additive);

	if (isAdditivePercent) {
		// For additive percent changes, we need to use the cached base value
		// (from the first access in this step) rather than currentValue.
		// This ensures multiple percent effects are additive from the original
		// base, not compounding from the updated value.
		const cacheKeyForBase = buildAdditiveCacheKey(context, resourceId);
		const bases = context.resourcePercentBases;
		// Peek at the cached base, or use currentValue if this is the first access
		const baseForDelta =
			cacheKeyForBase in bases ? bases[cacheKeyForBase]! : currentValue;

		// For additive percent changes, compute the RAW (unrounded) delta.
		// Rounding should only happen once at the end after all deltas are
		// accumulated, not on each individual delta.
		let rawDelta: number;
		if (change.type === 'percentFromResource') {
			const percent = getResourceValueFn(change.sourceResourceId) || 0;
			const mult = change.multiplier ?? 1;
			rawDelta = percent * baseForDelta * mult;
		} else {
			// percent type
			rawDelta =
				change.modifiers.reduce((sum, mod) => sum + mod, 0) * baseForDelta;
		}

		const result = applyAdditivePercentChange(
			context,
			player,
			catalog,
			resourceId,
			rawDelta,
			bounds,
			effect,
			change.roundingMode,
		);

		if (result.clampedToLowerBound || result.clampedToUpperBound) {
			const flags = ensureBoundFlags(player, resourceId);
			if (result.clampedToLowerBound) {
				flags.lower = true;
			}
			if (result.clampedToUpperBound) {
				flags.upper = true;
			}
		}

		if (!suppressHooks && context.services) {
			context.services.handleResourceChange(
				context,
				player,
				resourceId,
				result.appliedDelta,
			);
		}
		return result;
	}

	const result = reconcileResourceChange({
		currentValue,
		change,
		bounds,
		reconciliationMode,
		getResourceValue: getResourceValueFn,
	});
	if (result.clampedToLowerBound || result.clampedToUpperBound) {
		const flags = ensureBoundFlags(player, resourceId);
		if (result.clampedToLowerBound) {
			flags.lower = true;
		}
		if (result.clampedToUpperBound) {
			flags.upper = true;
		}
	}
	// Pass mode bypasses bounds - tell setResourceValue to skip clamping
	const skipBoundClamp = reconciliationMode === 'pass';
	setResourceValue(context, player, catalog, resourceId, result.finalValue, {
		skipBoundClamp,
	});
	// Track resource source deltas for UI breakdowns. Only run when the
	// context includes the source stack (full engine runs).
	const delta = result.finalValue - currentValue;
	if (delta !== 0 && Array.isArray(context.resourceSourceStack)) {
		recordEffectResourceDelta(effect, context, resourceId, delta);
	}
	if (!suppressHooks && context.services) {
		// Notify services about the resource change to trigger tier
		// passive swaps, win condition checks, and population triggers.
		context.services.handleResourceChange(context, player, resourceId, delta);
	}
	return result;
}

/**
 * Handler for `resource:add` ResourceV2 effects.
 * Expects params containing the target resource id, a change payload
 * (`{ type: 'amount', amount }` or `{ type: 'percent', modifiers,
 * roundingMode }`), and optional reconciliation metadata.
 */
export const resourceAddV2: ResourceEffectHandler = (
	effect,
	context,
	multiplier = 1,
) => applyResourceEffect('add', effect, context, multiplier);

/**
 * Handler for `resource:remove` ResourceV2 effects. Mirrors `resourceAddV2`
 * but applies the provided change as a subtraction. Percent-based removals
 * negate the supplied modifiers before reconciliation so downstream logging
 * records the delta as a negative value.
 */
export const resourceRemoveV2: ResourceEffectHandler = (
	effect,
	context,
	multiplier = 1,
) => applyResourceEffect('remove', effect, context, multiplier);

export type { ResourceReconciliationResult };
