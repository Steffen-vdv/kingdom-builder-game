import type { EffectDef } from '@kingdom-builder/protocol';

import type { EffectHandler } from '../../effects';
import type {
	PlayerResourceV2State,
	ResourceV2HookSuppressionMeta,
	ResourceV2ValueChangeRequest,
} from '../../state';
import { applyResourceV2ValueChange } from '../../state';

type ResourceV2RoundingMode = 'up' | 'down' | 'nearest';

interface ResourceV2EffectParams extends Record<string, unknown> {
	readonly id: string;
	readonly amount?: number;
	readonly percent?: number;
}

interface ResourceV2EffectMeta extends Record<string, unknown> {
	readonly reconciliation?: 'clamp';
	readonly suppressHooks?: ResourceV2HookSuppressionMeta;
	readonly usesPercent?: true;
}

type ResourceV2ResourceChangeEffect = EffectDef<ResourceV2EffectParams> & {
	readonly params: ResourceV2EffectParams;
	readonly meta: ResourceV2EffectMeta & { readonly reconciliation: 'clamp' };
};

export function isResourceV2ResourceChangeEffect(
	effect: EffectDef,
): effect is ResourceV2ResourceChangeEffect {
	if (!effect.meta) {
		return false;
	}

	if (!effect.params || typeof effect.params !== 'object') {
		return false;
	}

	const params = effect.params;
	if (typeof params['id'] !== 'string') {
		return false;
	}

	if ('key' in params) {
		return false;
	}

	const hasAmount = 'amount' in params;
	const hasPercent = 'percent' in params;
	if (!hasAmount && !hasPercent) {
		return false;
	}

	if (hasAmount && typeof params['amount'] !== 'number') {
		return false;
	}

	if (hasPercent && typeof params['percent'] !== 'number') {
		return false;
	}

	const meta = effect.meta;
	if (meta['reconciliation'] !== 'clamp') {
		return false;
	}

	return true;
}

export const resourceV2AddHandler: EffectHandler<ResourceV2EffectParams> = (
	effect,
	engineContext,
	mult = 1,
) => {
	if (!isResourceV2ResourceChangeEffect(effect)) {
		throw new Error('resourceV2AddHandler received non-ResourceV2 effect.');
	}

	const player = engineContext.activePlayer;
	const state = player.resourceV2;
	const delta = resolveResourceChangeDelta(effect, state, mult, 'add');

	const change: ResourceV2ValueChangeRequest = {
		delta,
		reconciliation: effect.meta.reconciliation ?? 'clamp',
		...(effect.meta.suppressHooks
			? { suppressHooks: effect.meta.suppressHooks }
			: {}),
	};

	applyResourceV2ValueChange(state, effect.params.id, change);
};

export const resourceV2RemoveHandler: EffectHandler<ResourceV2EffectParams> = (
	effect,
	engineContext,
	mult = 1,
) => {
	if (!isResourceV2ResourceChangeEffect(effect)) {
		throw new Error('resourceV2RemoveHandler received non-ResourceV2 effect.');
	}

	const player = engineContext.activePlayer;
	const state = player.resourceV2;
	const delta = resolveResourceChangeDelta(effect, state, mult, 'remove');

	const change: ResourceV2ValueChangeRequest = {
		delta,
		reconciliation: effect.meta.reconciliation ?? 'clamp',
		...(effect.meta.suppressHooks
			? { suppressHooks: effect.meta.suppressHooks }
			: {}),
	};

	applyResourceV2ValueChange(state, effect.params.id, change);
};

type ResourceChangeKind = 'add' | 'remove';

function resolveResourceChangeDelta(
	effect: ResourceV2ResourceChangeEffect,
	state: PlayerResourceV2State,
	mult: number,
	kind: ResourceChangeKind,
): number {
	const params = effect.params;
	assertKnownResource(state, params.id);

	if (Object.prototype.hasOwnProperty.call(state.parentChildren, params.id)) {
		throw new Error(
			`ResourceV2 parent "${params.id}" amount is derived from child resources.`,
		);
	}

	if (params.amount !== undefined) {
		return resolveAmountDelta(params.amount, mult, kind);
	}

	if (params.percent !== undefined) {
		const rounding = resolveRounding(effect.round);
		return resolvePercentDelta(
			state,
			params.id,
			params.percent,
			mult,
			rounding,
			kind,
		);
	}

	throw new Error(
		'ResourceV2 change is missing amount or percent configuration.',
	);
}

function resolveAmountDelta(
	amount: number,
	mult: number,
	kind: ResourceChangeKind,
): number {
	const total = amount * mult;
	if (!Number.isFinite(total)) {
		throw new Error('ResourceV2 change resolved to a non-finite amount.');
	}
	return kind === 'remove' ? -total : total;
}

function resolvePercentDelta(
	state: PlayerResourceV2State,
	resourceId: string,
	percent: number,
	mult: number,
	rounding: ResourceV2RoundingMode,
	kind: ResourceChangeKind,
): number {
	const current = state.amounts[resourceId] ?? 0;
	const totalPercent = percent * mult;
	const raw = (current * totalPercent) / 100;
	const rounded = round(raw, rounding);
	if (!Number.isFinite(rounded)) {
		throw new Error(
			'ResourceV2 percent change resolved to a non-finite amount.',
		);
	}
	return kind === 'remove' ? -rounded : rounded;
}

function round(value: number, mode: ResourceV2RoundingMode): number {
	if (mode === 'up') {
		return value >= 0 ? Math.ceil(value) : Math.floor(value);
	}

	if (mode === 'down') {
		return value >= 0 ? Math.floor(value) : Math.ceil(value);
	}

	const floored = Math.floor(value);
	const fractional = value - floored;
	if (fractional < 0.5) {
		return floored;
	}

	return Math.ceil(value);
}

function resolveRounding(round?: EffectDef['round']): ResourceV2RoundingMode {
	if (round === 'up' || round === 'down') {
		return round;
	}

	return 'nearest';
}

function assertKnownResource(state: PlayerResourceV2State, id: string) {
	if (!Object.prototype.hasOwnProperty.call(state.amounts, id)) {
		throw new Error(`Unknown ResourceV2 resource id: ${id}`);
	}
}
