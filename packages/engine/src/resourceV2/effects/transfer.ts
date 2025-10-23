import type { EffectDef } from '@kingdom-builder/protocol';

import type { EffectHandler } from '../../effects';
import type {
	PlayerResourceV2State,
	ResourceV2HookSuppressionMeta,
	ResourceV2ValueChangeRequest,
} from '../../state';
import type { ResourceV2EffectParams } from './shared';
import {
	assertKnownResource,
	resolvePercentDelta,
	resolveRounding,
} from './shared';

interface ResourceV2TransferParticipantMeta extends Record<string, unknown> {
	readonly reconciliation: 'clamp';
	readonly suppressHooks?: ResourceV2HookSuppressionMeta;
}

export interface ResourceV2TransferEffectMeta extends Record<string, unknown> {
	readonly donor: ResourceV2TransferParticipantMeta;
	readonly recipient: ResourceV2TransferParticipantMeta;
	readonly usesPercent?: true;
}

export type ResourceV2TransferEffect = EffectDef<ResourceV2EffectParams> & {
	readonly params: ResourceV2EffectParams;
	readonly meta: ResourceV2TransferEffectMeta;
};

export const resourceV2TransferHandler: EffectHandler<
	ResourceV2EffectParams
> = (effect, engineContext, mult = 1) => {
	if (!isResourceV2ResourceTransferEffect(effect)) {
		throw new Error('Transfer handler requires ResourceV2 input.');
	}

	const donor = engineContext.opponent;
	const recipient = engineContext.activePlayer;
	const donorState = donor.resourceV2;
	const recipientState = recipient.resourceV2;
	const resourceId = effect.params.id;

	assertKnownResource(recipientState, resourceId);
	if (
		Object.prototype.hasOwnProperty.call(
			recipientState.parentChildren,
			resourceId,
		)
	) {
		throw new Error(`ResourceV2 parent "${resourceId}" is child-derived.`);
	}

	const requested = resolveTransferRequest(effect, donorState, mult);
	const amount = resolveTransferAmount(
		donorState,
		recipientState,
		resourceId,
		requested,
	);

	const donorChange: ResourceV2ValueChangeRequest = {
		delta: -amount,
		reconciliation: effect.meta.donor.reconciliation,
		...(effect.meta.donor.suppressHooks
			? { suppressHooks: effect.meta.donor.suppressHooks }
			: {}),
	};
	const appliedRemoval = engineContext.resourceV2.applyValueChange(
		engineContext,
		donor,
		resourceId,
		donorChange,
	);

	const transferAmount = -appliedRemoval;
	const recipientChange: ResourceV2ValueChangeRequest = {
		delta: transferAmount,
		reconciliation: effect.meta.recipient.reconciliation,
		...(effect.meta.recipient.suppressHooks
			? { suppressHooks: effect.meta.recipient.suppressHooks }
			: {}),
	};

	engineContext.resourceV2.applyValueChange(
		engineContext,
		recipient,
		resourceId,
		recipientChange,
	);
};

export function isResourceV2ResourceTransferEffect(
	effect: EffectDef,
): effect is ResourceV2TransferEffect {
	if (!effect.meta || typeof effect.meta !== 'object') {
		return false;
	}

	const metaRecord: Record<string, unknown> = effect.meta;
	if (!isResourceV2TransferParticipantMeta(metaRecord['donor'])) {
		return false;
	}

	if (!isResourceV2TransferParticipantMeta(metaRecord['recipient'])) {
		return false;
	}

	if (!effect.params || typeof effect.params !== 'object') {
		return false;
	}

	const paramsRecord: Record<string, unknown> = effect.params;
	if (typeof paramsRecord['id'] !== 'string') {
		return false;
	}

	if ('key' in paramsRecord) {
		return false;
	}

	const hasAmount = Object.prototype.hasOwnProperty.call(
		paramsRecord,
		'amount',
	);
	const hasPercent = Object.prototype.hasOwnProperty.call(
		paramsRecord,
		'percent',
	);
	if (!hasAmount && !hasPercent) {
		return false;
	}

	if (hasAmount && typeof paramsRecord['amount'] !== 'number') {
		return false;
	}

	if (hasPercent && typeof paramsRecord['percent'] !== 'number') {
		return false;
	}

	return true;
}

function isResourceV2TransferParticipantMeta(
	value: unknown,
): value is ResourceV2TransferParticipantMeta {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const record = value as Record<string, unknown>;
	if (record['reconciliation'] !== 'clamp') {
		return false;
	}

	if (!('suppressHooks' in record)) {
		return true;
	}

	const suppression = record['suppressHooks'];
	if (!suppression || typeof suppression !== 'object') {
		return false;
	}

	const reason = (suppression as Record<string, unknown>)['reason'];
	return typeof reason === 'string';
}

function resolveTransferRequest(
	effect: ResourceV2TransferEffect,
	donorState: PlayerResourceV2State,
	mult: number,
): number {
	const params = effect.params;
	assertKnownResource(donorState, params.id);

	if (
		Object.prototype.hasOwnProperty.call(donorState.parentChildren, params.id)
	) {
		throw new Error(`ResourceV2 parent "${params.id}" is child-derived.`);
	}

	if (params.amount !== undefined) {
		const total = params.amount * mult;
		if (!Number.isFinite(total)) {
			throw new Error('Transfer resolved to non-finite amount.');
		}
		if (total < 0) {
			throw new Error('Transfer needs non-negative amount.');
		}
		return Math.abs(total);
	}

	if (params.percent !== undefined) {
		const rounding = resolveRounding(effect.round);
		const delta = resolvePercentDelta(
			donorState,
			params.id,
			params.percent,
			mult,
			rounding,
			'remove',
		);
		return Math.abs(delta);
	}

	throw new Error('Transfer missing amount or percent.');
}

function resolveTransferAmount(
	donorState: PlayerResourceV2State,
	recipientState: PlayerResourceV2State,
	resourceId: string,
	requested: number,
): number {
	if (!Number.isFinite(requested)) {
		throw new Error('Transfer resolved to non-finite amount.');
	}

	if (requested <= 0) {
		return 0;
	}

	const donorAvailable = resolveDonorAvailable(donorState, resourceId);
	const recipientCapacity = resolveRecipientCapacity(
		recipientState,
		resourceId,
	);
	const amount = Math.min(requested, donorAvailable, recipientCapacity);
	if (!Number.isFinite(amount)) {
		throw new Error('Transfer resolved to non-finite amount.');
	}
	if (amount < 0) {
		return 0;
	}
	return amount;
}

function resolveDonorAvailable(
	state: PlayerResourceV2State,
	resourceId: string,
): number {
	const bounds = state.bounds[resourceId];
	if (!bounds || bounds.lowerBound === undefined) {
		return Number.POSITIVE_INFINITY;
	}

	const current = state.amounts[resourceId] ?? 0;
	return Math.max(current - bounds.lowerBound, 0);
}

function resolveRecipientCapacity(
	state: PlayerResourceV2State,
	resourceId: string,
): number {
	const bounds = state.bounds[resourceId];
	if (!bounds || bounds.upperBound === undefined) {
		return Number.POSITIVE_INFINITY;
	}

	const current = state.amounts[resourceId] ?? 0;
	return Math.max(bounds.upperBound - current, 0);
}
