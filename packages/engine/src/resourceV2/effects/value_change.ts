import type { EffectDef } from '@kingdom-builder/protocol';
import type { EffectHandler } from '../../effects';
import type { EngineContext } from '../../context';
import {
	applyResourceV2Delta,
	type ApplyResourceV2DeltaResult,
} from '../../state/resource_v2';

interface ResourceV2EffectMeta extends Record<string, unknown> {
	readonly reconciliation: 'clamp';
	readonly suppressHooks?: { readonly reason: string };
	readonly usesPercent?: true;
}

interface ResourceV2ValueChangeParams extends Record<string, unknown> {
	readonly id: string;
	readonly amount?: number;
	readonly percent?: number;
}

type ResourceV2ValueChangeEffect = EffectDef<ResourceV2ValueChangeParams> & {
	readonly meta: ResourceV2EffectMeta;
};

type ResourceV2ValueChangeMode = 'add' | 'remove';
type PercentRoundingMode = 'up' | 'down' | 'nearest';

const ROUNDING_MODES: ReadonlySet<string> = new Set(['up', 'down', 'nearest']);

function hasOwn<V extends Record<string, unknown>, K extends PropertyKey>(
	value: V,
	key: K,
): value is V & Record<K, unknown> {
	return Object.prototype.hasOwnProperty.call(value, key);
}

function ensureResourcePresent(context: EngineContext, resourceId: string) {
	if (!(resourceId in context.activePlayer.resourceV2.amounts)) {
		const message = [
			'ResourceV2 value change references unknown resource id',
			`"${resourceId}".`,
		].join(' ');
		throw new Error(message);
	}
}

function resolvePercentRounding(
	effect: ResourceV2ValueChangeEffect,
): PercentRoundingMode {
	const round = effect.round;
	if (!round) {
		const message = [
			'ResourceV2 percent changes must specify an explicit',
			'rounding mode.',
		].join(' ');
		throw new Error(message);
	}
	if (!ROUNDING_MODES.has(round)) {
		const message = [
			'ResourceV2 percent rounding must be one of up, down, or',
			`nearest. Received: ${String(round)}.`,
		].join(' ');
		throw new Error(message);
	}
	return round as PercentRoundingMode;
}

function roundPercentDelta(value: number, mode: PercentRoundingMode): number {
	switch (mode) {
		case 'up':
			return value >= 0 ? Math.ceil(value) : Math.floor(value);
		case 'down':
			return value >= 0 ? Math.floor(value) : Math.ceil(value);
		case 'nearest': {
			const absolute = Math.abs(value);
			const floor = Math.floor(absolute);
			const fraction = absolute - floor;
			let rounded = floor;
			if (fraction > 0.5) {
				rounded = floor + 1;
			} else if (fraction === 0.5) {
				rounded = floor + 1;
			}
			return value >= 0 ? rounded : -rounded;
		}
		default: {
			const exhaustiveCheck: never = mode;
			return exhaustiveCheck;
		}
	}
}

function resolvePercentDelta(
	effect: ResourceV2ValueChangeEffect,
	context: EngineContext,
	mult: number,
	mode: ResourceV2ValueChangeMode,
): number {
	const params = effect.params!;
	const percent = params.percent;
	if (typeof percent !== 'number') {
		throw new Error(
			'ResourceV2 percent change requires a numeric percent parameter.',
		);
	}
	const rounding = resolvePercentRounding(effect);
	const sign = mode === 'add' ? 1 : -1;
	const state = context.activePlayer.resourceV2;
	const current = state.amounts[params.id] ?? 0;
	const totalPercent = percent * mult * sign;
	const rawDelta = (current * totalPercent) / 100;
	return roundPercentDelta(rawDelta, rounding);
}

function resolveAmountDelta(
	effect: ResourceV2ValueChangeEffect,
	mult: number,
	mode: ResourceV2ValueChangeMode,
): number {
	const params = effect.params!;
	const amount = params.amount;
	if (typeof amount !== 'number') {
		throw new Error(
			'ResourceV2 amount change requires a numeric amount parameter.',
		);
	}
	if (!Number.isInteger(amount)) {
		throw new Error(
			`ResourceV2 amount changes must use integers. Received: ${amount}.`,
		);
	}
	const sign = mode === 'add' ? 1 : -1;
	return amount * mult * sign;
}

function computeDelta(
	effect: ResourceV2ValueChangeEffect,
	context: EngineContext,
	mult: number,
	mode: ResourceV2ValueChangeMode,
): { delta: number; suppressHooks: boolean } {
	const params = effect.params!;
	if (typeof params.amount === 'number' && typeof params.percent === 'number') {
		throw new Error(
			'ResourceV2 value change cannot define both amount and percent.',
		);
	}

	const suppressHooks = Boolean(effect.meta.suppressHooks);

	if (typeof params.percent === 'number') {
		return {
			delta: resolvePercentDelta(effect, context, mult, mode),
			suppressHooks,
		};
	}

	if (typeof params.amount === 'number') {
		return {
			delta: resolveAmountDelta(effect, mult, mode),
			suppressHooks,
		};
	}

	throw new Error('ResourceV2 value change requires either amount or percent.');
}

function applyValueChange(
	effect: ResourceV2ValueChangeEffect,
	context: EngineContext,
	mult: number,
	mode: ResourceV2ValueChangeMode,
): ApplyResourceV2DeltaResult {
	const params = effect.params!;
	ensureResourcePresent(context, params.id);
	const state = context.activePlayer.resourceV2;
	const { delta, suppressHooks } = computeDelta(effect, context, mult, mode);
	if (delta === 0) {
		return {
			appliedDelta: 0,
			previousAmount: state.amounts[params.id] ?? 0,
			nextAmount: state.amounts[params.id] ?? 0,
			wasClamped: false,
		};
	}
	return applyResourceV2Delta(state, params.id, delta, {
		suppressHooks,
	});
}

export function isResourceV2ValueChangeEffect(
	effect: EffectDef,
): effect is ResourceV2ValueChangeEffect {
	if (!effect || typeof effect !== 'object') {
		return false;
	}
	const meta = effect.meta;
	if (!meta || typeof meta !== 'object') {
		return false;
	}
	if (!hasOwn(meta, 'reconciliation') || meta.reconciliation !== 'clamp') {
		return false;
	}
	const params = effect.params;
	if (!params || typeof params !== 'object') {
		return false;
	}
	if (!hasOwn(params, 'id') || typeof params.id !== 'string') {
		return false;
	}
	if (hasOwn(params, 'key')) {
		return false;
	}
	return true;
}

function ensureResourceV2Effect(
	effect: EffectDef,
): asserts effect is ResourceV2ValueChangeEffect {
	if (!isResourceV2ValueChangeEffect(effect)) {
		throw new Error(
			'ResourceV2 handler received an incompatible effect definition.',
		);
	}
}

function createResourceV2Handler(
	mode: ResourceV2ValueChangeMode,
): EffectHandler {
	return (effect, context, mult) => {
		ensureResourceV2Effect(effect);
		applyValueChange(effect, context, mult, mode);
	};
}

export const resourceV2AddHandler: EffectHandler =
	createResourceV2Handler('add');
export const resourceV2RemoveHandler: EffectHandler =
	createResourceV2Handler('remove');
