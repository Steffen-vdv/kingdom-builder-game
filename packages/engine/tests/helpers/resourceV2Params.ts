import type {
	ResourceChangeParameters,
	ResourceChangeRoundingMode,
	ResourceReconciliationMode,
} from '../../src/resource-v2/reconciliation.ts';
import { computeRequestedResourceDelta } from '../../src/resource-v2/reconciliation.ts';

interface BaseResourceParamsInput {
	readonly key: string;
	readonly resourceId?: string;
	readonly reconciliation?: ResourceReconciliationMode;
	readonly suppressHooks?: boolean;
}

interface ResourceAmountParamsInput extends BaseResourceParamsInput {
	readonly amount: number;
}

interface ResourcePercentParamsInput extends BaseResourceParamsInput {
	readonly percent?: number;
	readonly modifiers?: readonly number[];
	readonly roundingMode?: ResourceChangeRoundingMode;
}

interface BaseResourceParamsResult {
	readonly key: string;
	readonly resourceId: string;
	readonly change: ResourceChangeParameters;
	readonly reconciliation?: ResourceReconciliationMode;
	readonly suppressHooks?: boolean;
}

export interface ResourceAmountParamsResult extends BaseResourceParamsResult {
	readonly amount: number;
}

export interface ResourcePercentParamsResult extends BaseResourceParamsResult {
	readonly percent: number;
	readonly modifiers: readonly number[];
	readonly roundingMode?: ResourceChangeRoundingMode;
	readonly reconciledDelta: (
		currentValue: number,
		kind?: 'add' | 'remove',
	) => number;
}

export interface StatAmountParamsInput {
	readonly key: string;
	readonly statId?: string;
	readonly amount: number;
}

export interface StatAmountParamsResult {
	readonly key: string;
	readonly statId: string;
	readonly amount: number;
	readonly change: Extract<ResourceChangeParameters, { type: 'amount' }>;
}

function resolveResourceId(input: BaseResourceParamsInput): string {
	return input.resourceId ?? input.key;
}

export function resourceAmountParams(
	input: ResourceAmountParamsInput,
): ResourceAmountParamsResult {
	const resourceId = resolveResourceId(input);
	const amount = input.amount;
	return {
		key: input.key,
		amount,
		resourceId,
		change: { type: 'amount', amount },
		...(input.reconciliation ? { reconciliation: input.reconciliation } : {}),
		...(input.suppressHooks ? { suppressHooks: input.suppressHooks } : {}),
	} satisfies ResourceAmountParamsResult;
}

function normalisePercentModifiers(
	percent?: number,
	modifiers?: readonly number[],
): readonly number[] {
	if (modifiers && modifiers.length > 0) {
		return modifiers;
	}
	if (typeof percent === 'number') {
		return [percent];
	}
	return [0];
}

function invertChange(
	change: ResourceChangeParameters,
): ResourceChangeParameters {
	if (change.type === 'amount') {
		return { type: 'amount', amount: -change.amount };
	}
	return {
		type: 'percent',
		modifiers: change.modifiers.map((modifier) => -modifier),
		...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
	} satisfies ResourceChangeParameters;
}

export function resourcePercentParams(
	input: ResourcePercentParamsInput,
): ResourcePercentParamsResult {
	const resourceId = resolveResourceId(input);
	const modifiers = normalisePercentModifiers(input.percent, input.modifiers);
	const percent =
		typeof input.percent === 'number' ? input.percent : (modifiers[0] ?? 0);
	const change: Extract<ResourceChangeParameters, { type: 'percent' }> = {
		type: 'percent',
		modifiers,
		...(input.roundingMode ? { roundingMode: input.roundingMode } : {}),
	};

	const reconciledDelta = (
		currentValue: number,
		kind: 'add' | 'remove' = 'add',
	) => {
		if (kind === 'add') {
			return computeRequestedResourceDelta({ currentValue, change });
		}
		const inverted = invertChange(change);
		return computeRequestedResourceDelta({ currentValue, change: inverted });
	};

	const result: ResourcePercentParamsResult = {
		key: input.key,
		percent,
		modifiers,
		resourceId,
		change,
		...(input.roundingMode ? { roundingMode: input.roundingMode } : {}),
		...(input.reconciliation ? { reconciliation: input.reconciliation } : {}),
		...(input.suppressHooks ? { suppressHooks: input.suppressHooks } : {}),
		reconciledDelta,
	};

	return result;
}

export function statAmountParams(
	input: StatAmountParamsInput,
): StatAmountParamsResult {
	const statId = input.statId ?? input.key;
	const amount = input.amount;
	return {
		key: input.key,
		statId,
		amount,
		change: { type: 'amount', amount },
	} satisfies StatAmountParamsResult;
}
