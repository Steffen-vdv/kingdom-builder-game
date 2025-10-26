import {
	computeRequestedResourceDelta,
	type ResourceChangeParameters,
	type ResourceChangeRoundingMode,
	type ResourceReconciliationMode,
} from '../../src/resource-v2/reconciliation.ts';

type ResourceParamsExtras = {
	readonly reconciliation?: ResourceReconciliationMode;
	readonly suppressHooks?: boolean;
	readonly [key: string]: unknown;
};

function withResourceBase(
	resourceId: string,
	extras: ResourceParamsExtras = {},
): ResourceParamsExtras & {
	readonly resourceId: string;
	readonly key: string;
} {
	const { reconciliation, suppressHooks, ...rest } = extras;
	return {
		resourceId,
		key: resourceId,
		...(reconciliation !== undefined ? { reconciliation } : {}),
		...(suppressHooks !== undefined ? { suppressHooks } : {}),
		...rest,
	};
}

export function resourceAmountParams(
	resourceId: string,
	amount: number,
	extras: ResourceParamsExtras = {},
) {
	return {
		...withResourceBase(resourceId, extras),
		amount,
		change: { type: 'amount', amount } as Extract<
			ResourceChangeParameters,
			{ type: 'amount' }
		>,
	};
}

type PercentExtras = ResourceParamsExtras & {
	readonly roundingMode?: ResourceChangeRoundingMode;
};

export function resourcePercentParams(
	resourceId: string,
	percentOrModifiers: number | readonly number[],
	extras: PercentExtras = {},
) {
	const modifiers = Array.isArray(percentOrModifiers)
		? [...percentOrModifiers]
		: [percentOrModifiers];
	const { roundingMode, ...rest } = extras;
	return {
		...withResourceBase(resourceId, rest),
		percent: modifiers.length === 1 ? modifiers[0] : undefined,
		modifiers,
		change: {
			type: 'percent',
			modifiers,
			...(roundingMode ? { roundingMode } : {}),
		} as Extract<ResourceChangeParameters, { type: 'percent' }>,
	};
}

export function resourcePercentDelta(
	currentValue: number,
	params: ReturnType<typeof resourcePercentParams>,
	mode: 'add' | 'remove' = 'add',
): number {
	const delta = computeRequestedResourceDelta({
		currentValue,
		change: params.change,
	});
	return mode === 'remove' ? -delta : delta;
}

type StatParamsExtras = {
	readonly [key: string]: unknown;
};

export function statAmountParams(
	statId: string,
	amount: number,
	extras: StatParamsExtras = {},
) {
	return {
		statId,
		key: statId,
		amount,
		change: { type: 'amount', amount },
		...extras,
	};
}
