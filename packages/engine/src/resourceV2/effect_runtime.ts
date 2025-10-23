import type { EngineContext } from '../context';
import {
	adjustResourceValue,
	getResourceValue,
	getResourceValueState,
	type ResourceV2MutableStateValue,
} from './state';
import { applyResourceTiering } from './tiering';
import {
	computePercentDelta,
	normaliseAddAmount,
	normaliseRemoveAmount,
} from './value_helpers';
import { getResourceV2Runtime } from './runtime';
import type {
	ResourceV2ValueEffectParams,
	ResourceV2ValuePayload,
} from './value_types';

export const VALUE_EVALUATION_TARGET = 'resourceV2:value';
export const TRANSFER_DONOR_TARGET = 'resourceV2:transfer:donor';
export const TRANSFER_RECIPIENT_TARGET = 'resourceV2:transfer:recipient';

function cloneGain(amount: number, resourceId: string) {
	return [{ key: resourceId, amount }];
}

export function applyEvaluationModifiers(
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

export function applyValueDelta(
	context: EngineContext,
	resourceId: string,
	delta: number,
	suppressHooks: boolean,
): number {
	if (!Number.isFinite(delta) || delta === 0) {
		return 0;
	}
	const runtime = getResourceV2Runtime(context);
	const before = getResourceValue(runtime.state, resourceId);
	const next = adjustResourceValue(runtime.state, resourceId, delta);
	const actualDelta = next - before;
	if (actualDelta === 0) {
		return 0;
	}
	context.recentResourceGains.push({ key: resourceId, amount: actualDelta });
	if (!suppressHooks) {
		if (actualDelta > 0) {
			runtime.hooks?.onGain?.(context, resourceId, actualDelta);
		} else {
			runtime.hooks?.onLoss?.(context, resourceId, Math.abs(actualDelta));
		}
		runtime.hooks?.onValueChange?.(context, resourceId, actualDelta);
	}
	const resolveEffects = runtime.tiering?.resolveEffects
		? (id: string) => runtime.tiering?.resolveEffects?.(id)
		: undefined;
	applyResourceTiering({
		state: runtime.state,
		resourceId,
		context,
		...(resolveEffects ? { resolveEffects } : {}),
	});
	return actualDelta;
}

export function ensureChildResource(
	node: ResourceV2MutableStateValue,
	resourceId: string,
) {
	if (node.limited) {
		throw new Error(
			`Cannot directly mutate limited ResourceV2 parent value: ${resourceId}`,
		);
	}
}

export function computeValueDelta(
	context: EngineContext,
	params: ResourceV2ValueEffectParams,
	multiplier: number,
	mode: 'add' | 'remove',
): number {
	const runtime = getResourceV2Runtime(context);
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

export function computeTransferBaseAmount(
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
