import type { RuntimeResourceBounds } from './types';

export type ResourceReconciliationMode = 'clamp' | 'pass' | 'reject';

export type ResourceRoundingMode = 'up' | 'down' | 'nearest';

export interface ResourceChangeParameters {
	readonly amount?: number | null;
	readonly percentModifiers?: readonly number[];
	readonly roundingMode?: ResourceRoundingMode;
}

export interface ResourceDeltaComputationInput
	extends ResourceChangeParameters {
	readonly currentValue: number;
}

export interface ResourceReconciliationInput {
	readonly currentValue: number;
	readonly requestedDelta: number;
	readonly bounds: RuntimeResourceBounds;
	readonly mode: ResourceReconciliationMode;
}

export interface ResourceReconciliationResult {
	readonly requestedDelta: number;
	readonly appliedDelta: number;
	readonly finalValue: number;
	readonly clampedToLowerBound: boolean;
	readonly clampedToUpperBound: boolean;
}

const DEFAULT_ROUNDING_MODE: ResourceRoundingMode = 'nearest';

export function roundWithMode(
	value: number,
	mode: ResourceRoundingMode,
): number {
	switch (mode) {
		case 'up':
			return value >= 0 ? Math.ceil(value) : Math.floor(value);
		case 'down':
			return value >= 0 ? Math.floor(value) : Math.ceil(value);
		case 'nearest':
		default:
			return Math.round(value);
	}
}

export function computePercentDelta(
	currentValue: number,
	percentModifiers: readonly number[],
	roundingMode: ResourceRoundingMode,
): number {
	if (percentModifiers.length === 0) {
		return 0;
	}
	const totalModifier = percentModifiers.reduce(
		(sum, modifier) => sum + modifier,
		0,
	);
	if (totalModifier === 0) {
		return 0;
	}
	const rawDelta = currentValue * totalModifier;
	return roundWithMode(rawDelta, roundingMode);
}

export function computeRequestedDelta(
	input: ResourceDeltaComputationInput,
): number {
	const {
		currentValue,
		amount = 0,
		percentModifiers = [],
		roundingMode = DEFAULT_ROUNDING_MODE,
	} = input;
	const staticAmount = amount ?? 0;
	const percentDelta =
		percentModifiers.length > 0
			? computePercentDelta(currentValue, percentModifiers, roundingMode)
			: 0;
	return staticAmount + percentDelta;
}

export function clampValue(
	value: number,
	bounds: RuntimeResourceBounds,
): {
	readonly value: number;
	readonly clampedToLowerBound: boolean;
	readonly clampedToUpperBound: boolean;
} {
	const { lowerBound, upperBound } = bounds;
	let finalValue = value;
	let clampedToLowerBound = false;
	let clampedToUpperBound = false;
	if (typeof lowerBound === 'number' && finalValue < lowerBound) {
		finalValue = lowerBound;
		clampedToLowerBound = true;
	}
	if (typeof upperBound === 'number' && finalValue > upperBound) {
		finalValue = upperBound;
		clampedToUpperBound = true;
	}
	return { value: finalValue, clampedToLowerBound, clampedToUpperBound };
}

export function reconcileDelta(
	input: ResourceReconciliationInput,
): ResourceReconciliationResult {
	const { currentValue, requestedDelta, bounds, mode } = input;
	if (mode !== 'clamp') {
		throw new Error(
			`Resource reconciliation mode "${mode}" is not supported during MVP execution.`,
		);
	}
	const unclampedValue = currentValue + requestedDelta;
	const {
		value: finalValue,
		clampedToLowerBound,
		clampedToUpperBound,
	} = clampValue(unclampedValue, bounds);
	const appliedDelta = finalValue - currentValue;
	return {
		requestedDelta,
		appliedDelta,
		finalValue,
		clampedToLowerBound,
		clampedToUpperBound,
	};
}

export interface ResourceReconciliationPipelineInput
	extends ResourceChangeParameters {
	readonly currentValue: number;
	readonly bounds: RuntimeResourceBounds;
	readonly mode: ResourceReconciliationMode;
}

export function reconcileResourceChange(
	input: ResourceReconciliationPipelineInput,
): ResourceReconciliationResult {
	const { currentValue, bounds, mode, amount, percentModifiers, roundingMode } =
		input;
	const deltaInput: ResourceDeltaComputationInput = {
		currentValue,
		...(amount !== undefined ? { amount } : {}),
		...(percentModifiers !== undefined ? { percentModifiers } : {}),
		...(roundingMode !== undefined ? { roundingMode } : {}),
	};
	const requestedDelta = computeRequestedDelta(deltaInput);
	return reconcileDelta({
		currentValue,
		requestedDelta,
		bounds,
		mode,
	});
}
