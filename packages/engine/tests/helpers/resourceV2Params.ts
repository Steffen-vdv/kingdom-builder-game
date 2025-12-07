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
	readonly additive?: boolean;
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

function resolveResourceId(input: BaseResourceParamsInput): string {
	if (input.resourceId) {
		return input.resourceId;
	}
	// Keys ARE ResourceV2 IDs directly - no mapper needed
	return input.key;
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
		...(input.additive !== undefined ? { additive: input.additive } : {}),
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

interface PercentFromResourceParamsInput extends BaseResourceParamsInput {
	readonly sourceResourceId: string;
	readonly roundingMode?: ResourceChangeRoundingMode;
	readonly additive?: boolean;
	readonly multiplier?: number;
}

export interface PercentFromResourceParamsResult {
	readonly key: string;
	readonly resourceId: string;
	readonly change: Extract<
		ResourceChangeParameters,
		{ type: 'percentFromResource' }
	>;
	readonly reconciliation?: ResourceReconciliationMode;
	readonly suppressHooks?: boolean;
}

export function resourcePercentFromResourceParams(
	input: PercentFromResourceParamsInput,
): PercentFromResourceParamsResult {
	const resourceId = resolveResourceId(input);
	const change: Extract<
		ResourceChangeParameters,
		{ type: 'percentFromResource' }
	> = {
		type: 'percentFromResource',
		sourceResourceId: input.sourceResourceId,
		...(input.roundingMode ? { roundingMode: input.roundingMode } : {}),
		...(input.additive !== undefined ? { additive: input.additive } : {}),
		...(input.multiplier !== undefined ? { multiplier: input.multiplier } : {}),
	};

	return {
		key: input.key,
		resourceId,
		change,
		...(input.reconciliation ? { reconciliation: input.reconciliation } : {}),
		...(input.suppressHooks ? { suppressHooks: input.suppressHooks } : {}),
	};
}
