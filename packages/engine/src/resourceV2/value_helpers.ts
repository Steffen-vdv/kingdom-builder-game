import type {
	ResourceV2RoundingMode,
	ResourceV2ValuePayload,
} from './value_types';
import type { ResourceV2MutableStateValue } from './state';

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

export function applyPercentRounding(
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

export function normaliseAddAmount(amount: number): number {
	if (!Number.isFinite(amount)) {
		return 0;
	}
	return amount < 0 ? 0 : amount;
}

export function normaliseRemoveAmount(amount: number): number {
	if (!Number.isFinite(amount)) {
		return 0;
	}
	return amount > 0 ? 0 : amount;
}

export function computePercentDelta(
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

export function computeDonorLimit(node: ResourceV2MutableStateValue): number {
	if (node.bounds.lowerBound === undefined) {
		return node.value;
	}
	return Math.max(0, node.value - node.bounds.lowerBound);
}

export function computeRecipientCapacity(
	node: ResourceV2MutableStateValue,
): number {
	if (node.bounds.upperBound === undefined) {
		return Number.POSITIVE_INFINITY;
	}
	return Math.max(0, node.bounds.upperBound - node.value);
}
