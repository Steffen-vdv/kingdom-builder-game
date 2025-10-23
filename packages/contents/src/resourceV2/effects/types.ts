export type ResourceReconciliationMode = 'clamp' | 'pass' | 'reject';

export type ResourceChangeRoundingMode = 'up' | 'down' | 'nearest';

export interface ResourceAmountChangeParameters {
	readonly type: 'amount';
	readonly amount: number;
}

export interface ResourcePercentChangeParameters {
	readonly type: 'percent';
	readonly modifiers: readonly number[];
	readonly roundingMode?: ResourceChangeRoundingMode;
}

export type ResourceChangeParameters = ResourceAmountChangeParameters | ResourcePercentChangeParameters;
