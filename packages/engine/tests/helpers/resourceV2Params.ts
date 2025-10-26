import type { ResourceChangeRoundingMode } from '../../src/resource-v2/reconciliation.ts';

function roundPercentDelta(
	value: number,
	roundingMode: ResourceChangeRoundingMode,
): number {
	switch (roundingMode) {
		case 'up':
			return Math.ceil(value);
		case 'down':
			return Math.floor(value);
		case 'nearest':
		default:
			return Math.round(value);
	}
}

export interface ResourceAmountTestParams {
	readonly resourceId: string;
	readonly change: { readonly type: 'amount'; readonly amount: number };
	readonly key: string;
	readonly amount: number;
}

export interface ResourcePercentTestParams {
	readonly resourceId: string;
	readonly change: {
		readonly type: 'percent';
		readonly modifiers: readonly number[];
		readonly roundingMode?: ResourceChangeRoundingMode;
	};
	readonly key: string;
	readonly percent: number;
	readonly modifiers: readonly number[];
	readonly roundingMode?: ResourceChangeRoundingMode;
	readonly resolveDelta: (currentValue: number) => number;
}

export interface StatAmountTestParams {
	readonly statId: string;
	readonly change: { readonly type: 'amount'; readonly amount: number };
	readonly key: string;
	readonly amount: number;
}

export function resourceAmountParams(
	resourceId: string,
	amount: number,
): ResourceAmountTestParams {
	return {
		resourceId,
		change: { type: 'amount', amount },
		key: resourceId,
		amount,
	};
}

export function resourcePercentParams(
	resourceId: string,
	percent: number | readonly number[],
	options: { roundingMode?: ResourceChangeRoundingMode } = {},
): ResourcePercentTestParams {
	const modifiers = Array.isArray(percent) ? [...percent] : [percent];
	const roundingMode = options.roundingMode;
	const resolveDelta = (currentValue: number) => {
		const totalModifier = modifiers.reduce(
			(total, modifier) => total + modifier,
			0,
		);
		const rawDelta = totalModifier * currentValue;
		return roundPercentDelta(rawDelta, roundingMode ?? 'nearest');
	};

	return {
		resourceId,
		change: {
			type: 'percent',
			modifiers,
			...(roundingMode ? { roundingMode } : {}),
		},
		key: resourceId,
		percent: modifiers[0] ?? 0,
		modifiers,
		roundingMode,
		resolveDelta,
	};
}

export function statAmountParams(
	statId: string,
	amount: number,
): StatAmountTestParams {
	return {
		statId,
		change: { type: 'amount', amount },
		key: statId,
		amount,
	};
}
