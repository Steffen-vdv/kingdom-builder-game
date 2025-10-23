import type { ResourceV2ValueDelta } from '@kingdom-builder/protocol';
import { ResourceV2Reconciliation, ResourceV2Rounding } from '../resourcesV2';

type RoundingInput =
	| ResourceV2ValueDelta['rounding']
	| ResourceV2Rounding
	| undefined;

const ROUNDING_LOOKUP: Record<string, ResourceV2Rounding> = {
	up: ResourceV2Rounding.Up,
	down: ResourceV2Rounding.Down,
	nearest: ResourceV2Rounding.Nearest,
};

export const resolveRounding = (
	mode?: RoundingInput,
): ResourceV2Rounding | undefined => {
	if (mode === undefined) {
		return undefined;
	}
	const key = String(mode).toLowerCase();
	return ROUNDING_LOOKUP[key];
};

export const roundValue = (value: number, mode?: ResourceV2Rounding) => {
	if (mode === ResourceV2Rounding.Up) {
		return value >= 0 ? Math.ceil(value) : Math.floor(value);
	}
	if (mode === ResourceV2Rounding.Down) {
		return value >= 0 ? Math.floor(value) : Math.ceil(value);
	}
	return Math.round(value);
};

export const clampValue = (value: number, lower?: number, upper?: number) => {
	let next = value;
	if (lower !== undefined && next < lower) {
		next = lower;
	}
	if (upper !== undefined && next > upper) {
		next = upper;
	}
	return next;
};

export const normalizeReconciliation = (
	strategy?: ResourceV2ValueDelta['reconciliation'],
): ResourceV2Reconciliation => {
	if (!strategy || strategy === 'clamp') {
		return ResourceV2Reconciliation.Clamp;
	}
	throw new Error(
		`ResourceV2 reconciliation strategy "${strategy}" is not supported yet.`,
	);
};
