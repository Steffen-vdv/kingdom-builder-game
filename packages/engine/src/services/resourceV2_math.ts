import type { PlayerState, ResourceV2Key } from '../state';
import { ResourceV2Reconciliation, ResourceV2Rounding } from '../resourcesV2';

type RoundingInput = ResourceV2Rounding | 'up' | 'down' | 'nearest';
type ReconciliationInput =
	| ResourceV2Reconciliation
	| 'clamp'
	| 'pass'
	| 'reject';

export const roundValue = (amount: number, rounding: RoundingInput) => {
	if (rounding === ResourceV2Rounding.Up) {
		return Math.ceil(amount);
	}
	if (rounding === ResourceV2Rounding.Down) {
		return Math.floor(amount);
	}
	return Math.round(amount);
};

export const getBoundOrFallback = (
	value: number | undefined,
	fallback: number | undefined,
	defaultValue: number,
) => {
	if (value !== undefined) {
		return value;
	}
	if (fallback !== undefined) {
		return fallback;
	}
	return defaultValue;
};

export const reconcileValue = (
	player: PlayerState,
	resourceId: ResourceV2Key,
	proposed: number,
	fallbackLower: number | undefined,
	fallbackUpper: number | undefined,
	reconciliation: ReconciliationInput,
) => {
	if (reconciliation === ResourceV2Reconciliation.Reject) {
		return player.getResourceV2Value(resourceId);
	}
	if (reconciliation === ResourceV2Reconciliation.Pass) {
		return proposed;
	}
	const lower = player.getResourceV2LowerBound(resourceId);
	const upper = player.getResourceV2UpperBound(resourceId);
	const min = getBoundOrFallback(
		lower,
		fallbackLower,
		Number.NEGATIVE_INFINITY,
	);
	const max = getBoundOrFallback(
		upper,
		fallbackUpper,
		Number.POSITIVE_INFINITY,
	);
	if (proposed < min) {
		return min;
	}
	if (proposed > max) {
		return max;
	}
	return proposed;
};

export const reconcileBound = (
	proposed: number,
	fallbackLower: number | undefined,
	fallbackUpper: number | undefined,
	reconciliation: ReconciliationInput,
	target: 'lower' | 'upper',
) => {
	if (reconciliation === ResourceV2Reconciliation.Pass) {
		return proposed;
	}
	if (reconciliation === ResourceV2Reconciliation.Reject) {
		return target === 'lower' ? fallbackLower : fallbackUpper;
	}
	if (
		target === 'lower' &&
		fallbackLower !== undefined &&
		proposed < fallbackLower
	) {
		return fallbackLower;
	}
	if (
		target === 'upper' &&
		fallbackUpper !== undefined &&
		proposed > fallbackUpper
	) {
		return fallbackUpper;
	}
	return proposed;
};
