import type { EffectDef } from '@kingdom-builder/protocol';

import type { EffectHandler } from '../../effects';
import type {
	PlayerResourceV2State,
	ResourceV2ValueChangeRequest,
} from '../../state';
import { applyResourceV2ValueChange } from '../../state';
import type { ResourceV2EffectMeta, ResourceV2EffectParams } from './shared';
import {
	assertKnownResource,
	resolvePercentDelta,
	resolveRounding,
} from './shared';
export {
	isResourceV2ResourceTransferEffect,
	resourceV2TransferHandler,
} from './transfer';
export {
	isResourceV2UpperBoundIncreaseEffect,
	resourceV2IncreaseUpperBoundHandler,
} from './upper_bound';
export type {
	ResourceV2TransferEffect,
	ResourceV2TransferEffectMeta,
} from './transfer';
export type {
	ResourceV2UpperBoundIncreaseEffect,
	ResourceV2UpperBoundIncreaseEffectMeta,
} from './upper_bound';

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
		throw new Error(`ResourceV2 parent "${params.id}" is child-derived.`);
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

	throw new Error('ResourceV2 change missing amount or percent.');
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
