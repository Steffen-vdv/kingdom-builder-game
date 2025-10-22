import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import {
	adjustResourceValue,
	getResourceValue,
	getResourceValueState,
	type ResourceV2MutableStateValue,
	type ResourceV2State,
} from './state';

import type { EffectHandler } from '../effects';

export type ResourceV2ReconciliationStrategy = 'clamp';
export type ResourceV2RoundingMode = 'up' | 'down' | 'nearest';

export type ResourceV2ValuePayload =
	| { kind: 'amount'; amount: number }
	| { kind: 'percent'; percent: number; rounding: ResourceV2RoundingMode };

export interface ResourceV2ValueEffectParams {
	resourceId: string;
	payload: ResourceV2ValuePayload;
	reconciliation: ResourceV2ReconciliationStrategy;
	suppressHooks?: boolean;
}

export interface ResourceV2TransferEndpointParams {
	resourceId: string;
	reconciliation: ResourceV2ReconciliationStrategy;
}

export interface ResourceV2TransferEffectParams {
	donor: ResourceV2TransferEndpointParams;
	recipient: ResourceV2TransferEndpointParams;
	payload: ResourceV2ValuePayload;
	suppressHooks?: boolean;
}

export interface ResourceV2BoundAdjustmentParams {
	resourceId: string;
	amount: number;
	reconciliation: ResourceV2ReconciliationStrategy;
}

export interface ResourceV2RuntimeHooks {
	onValueChange?(
		context: EngineContext,
		resourceId: string,
		delta: number,
	): void;
	onUpperBoundIncrease?(
		context: EngineContext,
		resourceId: string,
		amount: number,
		nextBound: number | undefined,
	): void;
}

export interface ResourceV2Runtime {
	state: ResourceV2State;
	hooks?: ResourceV2RuntimeHooks;
}

interface ResourceV2ContextCarrier {
	resourceV2?: ResourceV2Runtime;
}

const VALUE_EVALUATION_TARGET = 'resourceV2:value';
const TRANSFER_DONOR_TARGET = 'resourceV2:transfer:donor';
const TRANSFER_RECIPIENT_TARGET = 'resourceV2:transfer:recipient';

function getRuntime(context: EngineContext): ResourceV2Runtime {
	const carrier = context as EngineContext & ResourceV2ContextCarrier;
	if (!carrier.resourceV2) {
		throw new Error('ResourceV2 state not initialised on the engine context.');
	}
	return carrier.resourceV2;
}

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

function roundUp(value: number): number {
	return value >= 0 ? Math.ceil(value) : Math.floor(value);
}

function roundDown(value: number): number {
	return value >= 0 ? Math.floor(value) : Math.ceil(value);
}

function roundNearest(value: number): number {
	if (!Number.isFinite(value) || value === 0) {
		return 0;
	}
	const abs = Math.abs(value);
	const floor = Math.floor(abs);
	const fraction = abs - floor;
	const increment = fraction >= 0.5 ? 1 : 0;
	const rounded = floor + increment;
	return value > 0 ? rounded : -rounded;
}

function applyPercentRounding(
	value: number,
	mode: ResourceV2RoundingMode,
): number {
	if (mode === 'up') {
		return roundUp(value);
	}
	if (mode === 'down') {
		return roundDown(value);
	}
	return roundNearest(value);
}

function cloneGain(amount: number, resourceId: string) {
	return [{ key: resourceId, amount }];
}

function applyEvaluationModifiers(
	context: EngineContext,
	target: string,
	resourceId: string,
	baseAmount: number,
): number {
	if (!Number.isFinite(baseAmount) || baseAmount === 0) {
		return baseAmount;
	}
	const gains = cloneGain(baseAmount, resourceId);
	context.passives.runEvaluationMods(target, context, gains);
	context.passives.runEvaluationMods(`${target}:${resourceId}`, context, gains);
	return gains[0]!.amount;
}

function applyValueDelta(
	context: EngineContext,
	resourceId: string,
	delta: number,
	suppressHooks: boolean,
): number {
	if (!Number.isFinite(delta) || delta === 0) {
		return 0;
	}
	const runtime = getRuntime(context);
	const before = getResourceValue(runtime.state, resourceId);
	const next = adjustResourceValue(runtime.state, resourceId, delta);
	const actualDelta = next - before;
	if (actualDelta === 0) {
		return 0;
	}
	context.recentResourceGains.push({ key: resourceId, amount: actualDelta });
	if (!suppressHooks) {
		runtime.hooks?.onValueChange?.(context, resourceId, actualDelta);
	}
	return actualDelta;
}

function ensureChildResource(
	node: ResourceV2MutableStateValue,
	resourceId: string,
) {
	if (node.limited) {
		throw new Error(
			`Cannot directly mutate limited ResourceV2 parent value: ${resourceId}`,
		);
	}
}

function normaliseAddAmount(amount: number): number {
	if (!Number.isFinite(amount)) {
		return 0;
	}
	return amount < 0 ? 0 : amount;
}

function normaliseRemoveAmount(amount: number): number {
	if (!Number.isFinite(amount)) {
		return 0;
	}
	return amount > 0 ? 0 : amount;
}

function computePercentDelta(
	current: number,
	payload: Extract<ResourceV2ValuePayload, { kind: 'percent' }>,
	multiplier: number,
): number {
	const totalPercent = payload.percent * multiplier;
	if (!Number.isFinite(totalPercent) || totalPercent === 0) {
		return 0;
	}
	const raw = (current * totalPercent) / 100;
	return applyPercentRounding(raw, payload.rounding);
}

function computeValueDelta(
	context: EngineContext,
	params: ResourceV2ValueEffectParams,
	multiplier: number,
	mode: 'add' | 'remove',
): number {
	const runtime = getRuntime(context);
	const node = getResourceValueState(runtime.state, params.resourceId);
	ensureChildResource(node, params.resourceId);
	const baseAmount =
		params.payload.kind === 'amount'
			? params.payload.amount * multiplier
			: computePercentDelta(node.value, params.payload, multiplier);
	const adjusted = applyEvaluationModifiers(
		context,
		VALUE_EVALUATION_TARGET,
		params.resourceId,
		baseAmount,
	);
	if (mode === 'add') {
		return normaliseAddAmount(adjusted);
	}
	return normaliseRemoveAmount(-Math.abs(adjusted));
}

function computeTransferBaseAmount(
	donorValue: number,
	payload: ResourceV2ValuePayload,
	multiplier: number,
): number {
	if (payload.kind === 'amount') {
		return payload.amount * multiplier;
	}
	const percentDelta = computePercentDelta(donorValue, payload, multiplier);
	return Math.abs(percentDelta);
}

function computeDonorLimit(node: ResourceV2MutableStateValue): number {
	if (node.bounds.lowerBound === undefined) {
		return node.value;
	}
	return Math.max(0, node.value - node.bounds.lowerBound);
}

function computeRecipientCapacity(node: ResourceV2MutableStateValue): number {
	if (node.bounds.upperBound === undefined) {
		return Number.POSITIVE_INFINITY;
	}
	return Math.max(0, node.bounds.upperBound - node.value);
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
	const runtime = getRuntime(context);
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
	const runtime = getRuntime(context);
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
