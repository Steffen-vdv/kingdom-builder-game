import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../../context';
import type { PlayerState } from '../../state';
import { setResourceValue, getResourceValue } from '../state';
import { ensureBoundFlags, resolveResourceDefinition } from '../state-helpers';
import {
	reconcileResourceChange,
	type ResourceChangeParameters,
	type ResourceReconciliationMode,
	type ResourceReconciliationResult,
} from '../reconciliation';
import type { RuntimeResourceCatalog, RuntimeResourceBounds } from '../types';

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
	 * When true, downstream hook emission (tier checks, win conditions,
	 * etc.) should be skipped.
	 *
	 * Resource Migration MVP keeps the field for forward compatibility
	 * but does not implement suppression yet. Follow-up tasks will honour
	 * the flag when the new hook plumbing is ready.
	 */
	readonly suppressHooks?: boolean;
}

interface AmountResourceEffectParams extends BaseResourceEffectParams {
	readonly change: Extract<ResourceChangeParameters, { type: 'amount' }>;
}

interface PercentResourceEffectParams extends BaseResourceEffectParams {
	readonly change: Extract<ResourceChangeParameters, { type: 'percent' }>;
}

export type ResourceEffectParams =
	| AmountResourceEffectParams
	| PercentResourceEffectParams;

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
		return { type: 'amount', amount };
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
		return { type: 'amount', amount: change.amount * multiplier };
	}
	return {
		type: 'percent',
		modifiers: change.modifiers.map((modifier) => modifier * multiplier),
		...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
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
		return { type: 'amount', amount: -change.amount };
	}
	return {
		type: 'percent',
		modifiers: change.modifiers.map((modifier) => -modifier),
		...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
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
	const result = reconcileResourceChange({
		currentValue,
		change,
		bounds,
		reconciliationMode,
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
	setResourceValue(context, player, catalog, resourceId, result.finalValue);
	if (suppressHooks) {
		// TODO(Resource Migration): honour suppressHooks once the
		// ResourceV2 hook plumbing lands.
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
