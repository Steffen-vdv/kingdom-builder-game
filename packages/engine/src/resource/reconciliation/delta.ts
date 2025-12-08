import type {
	ComputeResourceDeltaInput,
	ResourceChangeRoundingMode,
} from './types';

const DEFAULT_PERCENT_ROUNDING_MODE: ResourceChangeRoundingMode = 'nearest';

function roundValue(value: number, mode: ResourceChangeRoundingMode): number {
	switch (mode) {
		case 'up': {
			return Math.ceil(value);
		}
		case 'down': {
			return Math.floor(value);
		}
		case 'nearest': {
			return Math.round(value);
		}
		default: {
			return Math.round(value);
		}
	}
}

export function computeRequestedResourceDelta(
	input: ComputeResourceDeltaInput,
): number {
	const { currentValue, change, getResourceValue } = input;

	if (change.type === 'amount') {
		if (change.roundingMode) {
			return roundValue(change.amount, change.roundingMode);
		}
		return change.amount;
	}

	if (change.type === 'percent') {
		const percentChange =
			change.modifiers.reduce((total, modifier) => total + modifier, 0) *
			currentValue;
		const roundingMode = change.roundingMode ?? DEFAULT_PERCENT_ROUNDING_MODE;
		return roundValue(percentChange, roundingMode);
	}

	// percentFromResource: get percent value from another resource
	if (!getResourceValue) {
		throw new Error(
			'percentFromResource change requires getResourceValue provider',
		);
	}
	const percent = getResourceValue(change.sourceResourceId) || 0;
	const multiplier = change.multiplier ?? 1;
	const percentChange = percent * currentValue * multiplier;
	const roundingMode = change.roundingMode ?? DEFAULT_PERCENT_ROUNDING_MODE;
	return roundValue(percentChange, roundingMode);
}
