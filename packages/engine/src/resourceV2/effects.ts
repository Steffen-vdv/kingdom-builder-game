import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import { getResourceValueState } from './state';
import {
	computeDonorLimit,
	computeRecipientCapacity,
	normaliseAddAmount,
} from './value_helpers';
import type {
	ResourceV2BoundAdjustmentParams,
	ResourceV2ReconciliationStrategy,
	ResourceV2TransferEffectParams,
	ResourceV2ValueEffectParams,
	ResourceV2ValuePayload,
} from './value_types';

import type { EffectHandler } from '../effects';
import {
	TRANSFER_DONOR_TARGET,
	TRANSFER_RECIPIENT_TARGET,
	applyEvaluationModifiers,
	applyValueDelta,
	computeValueDelta,
	computeTransferBaseAmount,
	ensureChildResource,
} from './effect_runtime';
import { getResourceV2Runtime } from './runtime';

function isClamp(
	strategy: ResourceV2ReconciliationStrategy | undefined,
): boolean {
	return strategy === 'clamp';
}

function ensureClamp(strategy: ResourceV2ReconciliationStrategy | undefined) {
	if (!isClamp(strategy)) {
		throw new Error(
			`ResourceV2 handlers only support clamp reconciliation. Received: ${String(
				strategy,
			)}`,
		);
	}
}

function resolveSuppressHooks(
	effect: EffectDef,
	params: { suppressHooks?: boolean } | undefined,
): boolean {
	if (params && typeof params.suppressHooks === 'boolean') {
		return params.suppressHooks;
	}
	const candidate = (effect as { suppressHooks?: unknown }).suppressHooks;
	if (typeof candidate === 'boolean') {
		return candidate;
	}
	const metaFlag = effect.meta?.['suppressHooks'];
	return typeof metaFlag === 'boolean' ? metaFlag : false;
}

export function resourceV2Add(
	effect: EffectDef<ResourceV2ValueEffectParams>,
	context: EngineContext,
	multiplier = 1,
) {
	ensureClamp(effect.params?.reconciliation);
	const suppressHooks = resolveSuppressHooks(effect, effect.params);
	const delta = computeValueDelta(context, effect.params!, multiplier, 'add');
	if (delta === 0) {
		return;
	}
	applyValueDelta(context, effect.params!.resourceId, delta, suppressHooks);
}

export function resourceV2Remove(
	effect: EffectDef<ResourceV2ValueEffectParams>,
	context: EngineContext,
	multiplier = 1,
) {
	ensureClamp(effect.params?.reconciliation);
	const suppressHooks = resolveSuppressHooks(effect, effect.params);
	const delta = computeValueDelta(
		context,
		effect.params!,
		multiplier,
		'remove',
	);
	if (delta === 0) {
		return;
	}
	applyValueDelta(context, effect.params!.resourceId, delta, suppressHooks);
}

export function resourceV2Transfer(
	effect: EffectDef<ResourceV2TransferEffectParams>,
	context: EngineContext,
	multiplier = 1,
) {
	const params = effect.params!;
	ensureClamp(params.donor?.reconciliation);
	ensureClamp(params.recipient?.reconciliation);
	const runtime = getResourceV2Runtime(context);
	const donorNode = getResourceValueState(
		runtime.state,
		params.donor.resourceId,
	);
	const recipientNode = getResourceValueState(
		runtime.state,
		params.recipient.resourceId,
	);
	ensureChildResource(donorNode, params.donor.resourceId);
	ensureChildResource(recipientNode, params.recipient.resourceId);
	const suppressHooks = resolveSuppressHooks(effect, params);

	let baseAmount = computeTransferBaseAmount(
		donorNode.value,
		params.payload,
		multiplier,
	);
	baseAmount = normaliseAddAmount(baseAmount);
	if (baseAmount === 0) {
		return;
	}

	const donorAdjusted = normaliseAddAmount(
		applyEvaluationModifiers(
			context,
			TRANSFER_DONOR_TARGET,
			params.donor.resourceId,
			baseAmount,
		),
	);
	if (donorAdjusted === 0) {
		return;
	}

	const donorLimit = computeDonorLimit(donorNode);
	if (donorLimit === 0) {
		return;
	}
	const recipientCapacity = computeRecipientCapacity(recipientNode);
	if (recipientCapacity === 0) {
		return;
	}

	const donorBounded = Math.min(donorAdjusted, donorLimit);
	if (donorBounded <= 0) {
		return;
	}

	const recipientAdjusted = normaliseAddAmount(
		applyEvaluationModifiers(
			context,
			TRANSFER_RECIPIENT_TARGET,
			params.recipient.resourceId,
			donorBounded,
		),
	);
	if (recipientAdjusted === 0) {
		return;
	}

	const finalAmount = Math.min(
		donorBounded,
		recipientAdjusted,
		recipientCapacity,
	);
	if (finalAmount <= 0) {
		return;
	}

	const donorDelta = applyValueDelta(
		context,
		params.donor.resourceId,
		-finalAmount,
		suppressHooks,
	);
	const actualTransfer = Math.abs(donorDelta);
	if (actualTransfer === 0) {
		return;
	}

	const recipientLimit = computeRecipientCapacity(
		getResourceValueState(runtime.state, params.recipient.resourceId),
	);
	if (recipientLimit <= 0) {
		return;
	}

	const recipientAmount = Math.min(actualTransfer, recipientLimit);
	if (recipientAmount <= 0) {
		return;
	}

	applyValueDelta(
		context,
		params.recipient.resourceId,
		recipientAmount,
		suppressHooks,
	);
}

export function resourceV2UpperBoundIncrease(
	effect: EffectDef<ResourceV2BoundAdjustmentParams>,
	context: EngineContext,
	multiplier = 1,
) {
	const params = effect.params!;
	ensureClamp(params.reconciliation);
	const runtime = getResourceV2Runtime(context);
	const node = getResourceValueState(runtime.state, params.resourceId);
	const amount = params.amount * multiplier;
	if (!Number.isFinite(amount) || amount <= 0) {
		return;
	}
	const current = node.bounds.upperBound;
	const next = current === undefined ? amount : current + amount;
	node.bounds.upperBound = next;
	runtime.hooks?.onUpperBoundIncrease?.(
		context,
		params.resourceId,
		amount,
		next,
	);
}

function hasValuePayload(payload: unknown): payload is ResourceV2ValuePayload {
	if (!payload || typeof payload !== 'object') {
		return false;
	}
	if ('kind' in payload) {
		const kind = (payload as { kind: unknown }).kind;
		if (kind === 'amount') {
			return typeof (payload as { amount?: unknown }).amount === 'number';
		}
		if (kind === 'percent') {
			const percent = (payload as { percent?: unknown }).percent;
			const rounding = (payload as { rounding?: unknown }).rounding;
			return (
				typeof percent === 'number' &&
				(rounding === 'up' || rounding === 'down' || rounding === 'nearest')
			);
		}
	}
	return false;
}

export function isResourceV2ValueEffect(
	effect: EffectDef,
): effect is EffectDef<ResourceV2ValueEffectParams> {
	const params = effect.params as ResourceV2ValueEffectParams | undefined;
	if (!params || typeof params !== 'object') {
		return false;
	}
	if (typeof params.resourceId !== 'string') {
		return false;
	}
	if (!hasValuePayload(params.payload)) {
		return false;
	}
	return isClamp(params.reconciliation);
}

export function isResourceV2TransferEffect(
	effect: EffectDef,
): effect is EffectDef<ResourceV2TransferEffectParams> {
	const params = effect.params as ResourceV2TransferEffectParams | undefined;
	if (!params || typeof params !== 'object') {
		return false;
	}
	const donor = params.donor;
	const recipient = params.recipient;
	if (!donor || !recipient) {
		return false;
	}
	if (
		typeof donor.resourceId !== 'string' ||
		typeof recipient.resourceId !== 'string'
	) {
		return false;
	}
	if (!isClamp(donor.reconciliation) || !isClamp(recipient.reconciliation)) {
		return false;
	}
	return hasValuePayload(params.payload);
}

export function isResourceV2UpperBoundIncreaseEffect(
	effect: EffectDef,
): effect is EffectDef<ResourceV2BoundAdjustmentParams> {
	const params = effect.params as ResourceV2BoundAdjustmentParams | undefined;
	if (!params || typeof params !== 'object') {
		return false;
	}
	if (typeof params.resourceId !== 'string') {
		return false;
	}
	return typeof params.amount === 'number' && isClamp(params.reconciliation);
}

export type ResourceV2EffectHandler<P extends Record<string, unknown>> =
	EffectHandler<P>;

export type {
	ResourceV2BoundAdjustmentParams,
	ResourceV2ReconciliationStrategy,
	ResourceV2RoundingMode,
	ResourceV2TransferEffectParams,
	ResourceV2TransferEndpointParams,
	ResourceV2ValueEffectParams,
	ResourceV2ValuePayload,
} from './value_types';

export type {
	ResourceV2Runtime,
	ResourceV2RuntimeHooks,
	ResourceV2TieringRuntime,
} from './runtime';
