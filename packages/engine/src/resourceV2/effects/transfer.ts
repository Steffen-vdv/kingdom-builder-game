import type { EffectDef } from '@kingdom-builder/protocol';

import type { EffectHandler } from '../../effects';
import type {
	PlayerResourceV2State,
	ResourceV2HookSuppressionMeta,
	ResourceV2ValueChangeRequest,
} from '../../state';
import { applyResourceV2ValueChange } from '../../state';
import type { ResourceV2RoundingMode } from './common';
import {
	assertKnownResource,
	assertResourceSupportsDirectMutations,
	resolveRounding,
	round,
} from './common';

interface ResourceV2TransferEffectParams extends Record<string, unknown> {
	readonly donorId: string;
	readonly recipientId: string;
	readonly amount?: number;
	readonly percent?: number;
}

interface ResourceV2TransferParticipantMeta extends Record<string, unknown> {
	readonly reconciliation?: 'clamp';
	readonly suppressHooks?: ResourceV2HookSuppressionMeta;
}

interface ResourceV2TransferEffectMeta extends Record<string, unknown> {
	readonly donor: ResourceV2TransferParticipantMeta;
	readonly recipient: ResourceV2TransferParticipantMeta;
	readonly usesPercent?: true;
}

type ResourceV2TransferEffect = EffectDef<ResourceV2TransferEffectParams> & {
	readonly params: ResourceV2TransferEffectParams;
	readonly meta: ResourceV2TransferEffectMeta;
};

export function isResourceV2TransferEffect(
	effect: EffectDef,
): effect is ResourceV2TransferEffect {
	if (!effect.meta || typeof effect.meta !== 'object') {
		return false;
	}

	if (!effect.params || typeof effect.params !== 'object') {
		return false;
	}

	const params = effect.params;
	if (typeof params['donorId'] !== 'string') {
		return false;
	}

	if (typeof params['recipientId'] !== 'string') {
		return false;
	}

	const hasAmount = Object.prototype.hasOwnProperty.call(params, 'amount');
	const hasPercent = Object.prototype.hasOwnProperty.call(params, 'percent');
	if (hasAmount === hasPercent) {
		return false;
	}

	if (hasAmount && typeof params['amount'] !== 'number') {
		return false;
	}

	if (hasPercent && typeof params['percent'] !== 'number') {
		return false;
	}

	const meta = effect.meta;
	if (!isTransferParticipantMeta(meta['donor'])) {
		return false;
	}

	if (!isTransferParticipantMeta(meta['recipient'])) {
		return false;
	}

	if ('usesPercent' in meta && meta['usesPercent'] !== true) {
		return false;
	}

	return true;
}

export const resourceV2TransferHandler: EffectHandler<
	ResourceV2TransferEffectParams
> = (effect, engineContext, mult = 1) => {
	if (!isResourceV2TransferEffect(effect)) {
		throw new Error(
			'resourceV2TransferHandler expected a ResourceV2 transfer effect.',
		);
	}

	const donorPlayer = engineContext.opponent;
	const recipientPlayer = engineContext.activePlayer;
	const donorState = donorPlayer.resourceV2;
	const recipientState = recipientPlayer.resourceV2;

	const { donorId, recipientId } = effect.params;
	assertResourceSupportsDirectMutations(donorState, donorId);
	assertResourceSupportsDirectMutations(recipientState, recipientId);

	const requested = resolveTransferRequest(effect, donorState, mult);
	const donorChange = createTransferChange(-requested, effect.meta.donor);
	const donorApplied = applyResourceV2ValueChange(
		donorState,
		donorId,
		donorChange,
	);

	const transferred = donorApplied < 0 ? -donorApplied : 0;
	const recipientChange = createTransferChange(
		transferred,
		effect.meta.recipient,
	);
	const recipientApplied = applyResourceV2ValueChange(
		recipientState,
		recipientId,
		recipientChange,
	);

	if (recipientApplied < transferred) {
		const refund = transferred - recipientApplied;
		if (refund > 0) {
			const refundChange = createTransferChange(refund, effect.meta.donor);
			applyResourceV2ValueChange(donorState, donorId, refundChange);
		}
	}
};

function isTransferParticipantMeta(
	value: unknown,
): value is ResourceV2TransferParticipantMeta {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const meta = value as Record<string, unknown>;
	if (
		'reconciliation' in meta &&
		meta['reconciliation'] !== undefined &&
		meta['reconciliation'] !== 'clamp'
	) {
		return false;
	}

	if ('suppressHooks' in meta && meta['suppressHooks'] !== undefined) {
		if (!isHookSuppressionMeta(meta['suppressHooks'])) {
			return false;
		}
	}

	return true;
}

function isHookSuppressionMeta(
	value: unknown,
): value is ResourceV2HookSuppressionMeta {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const record = value as Record<string, unknown>;
	return typeof record['reason'] === 'string' && record['reason'].length > 0;
}

function resolveTransferRequest(
	effect: ResourceV2TransferEffect,
	donorState: PlayerResourceV2State,
	mult: number,
): number {
	const params = effect.params;
	if (params.amount !== undefined) {
		return resolveTransferAmount(params.amount, mult);
	}

	if (params.percent !== undefined) {
		const rounding = resolveRounding(effect.round);
		return resolveTransferPercent(
			donorState,
			params.donorId,
			params.percent,
			mult,
			rounding,
		);
	}

	throw new Error(
		'ResourceV2 transfer requires amount or percent configuration.',
	);
}

function resolveTransferAmount(amount: number, mult: number): number {
	const total = amount * mult;
	if (!Number.isFinite(total)) {
		throw new Error('ResourceV2 transfer resolved to a non-finite amount.');
	}

	if (total < 0) {
		throw new Error('Transfer amount must not be negative.');
	}

	if (!Number.isInteger(total)) {
		throw new Error('Transfer amount must resolve to an integer.');
	}

	return total;
}

function resolveTransferPercent(
	state: PlayerResourceV2State,
	donorId: string,
	percent: number,
	mult: number,
	rounding: ResourceV2RoundingMode,
): number {
	assertKnownResource(state, donorId);

	const current = state.amounts[donorId] ?? 0;
	const totalPercent = percent * mult;
	if (!Number.isFinite(totalPercent)) {
		throw new Error('Transfer percent resolved to a non-finite amount.');
	}

	const raw = (current * totalPercent) / 100;
	const rounded = round(raw, rounding);
	if (rounded < 0) {
		throw new Error('Transfer percent must not be negative.');
	}

	return rounded;
}

function createTransferChange(
	delta: number,
	meta: ResourceV2TransferParticipantMeta,
): ResourceV2ValueChangeRequest {
	return {
		delta,
		reconciliation: meta.reconciliation ?? 'clamp',
		...(meta.suppressHooks ? { suppressHooks: meta.suppressHooks } : {}),
	};
}
