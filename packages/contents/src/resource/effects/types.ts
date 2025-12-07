export type ResourceReconciliationMode = 'clamp' | 'pass' | 'reject';

export type ResourceChangeRoundingMode = 'up' | 'down' | 'nearest';

export interface ResourceAmountChangeParameters {
	readonly type: 'amount';
	readonly amount: number;
	readonly roundingMode?: ResourceChangeRoundingMode;
}

export interface ResourcePercentChangeParameters {
	readonly type: 'percent';
	readonly modifiers: readonly number[];
	readonly roundingMode?: ResourceChangeRoundingMode;
}

export interface ResourcePercentFromResourceChangeParameters {
	readonly type: 'percentFromResource';
	readonly sourceResourceId: string;
	readonly roundingMode?: ResourceChangeRoundingMode;
	readonly additive?: boolean;
}

export type ResourceChangeParameters = ResourceAmountChangeParameters | ResourcePercentChangeParameters | ResourcePercentFromResourceChangeParameters;

export type ResourcePlayerScope = 'active' | 'opponent';

export interface ResourceValueWriteOptions {
	readonly suppressRecentEntry?: boolean;
	readonly skipTierUpdate?: boolean;
}

export interface ResourceTransferEndpointPayload {
	readonly player?: ResourcePlayerScope;
	readonly resourceId: string;
	readonly change: ResourceChangeParameters;
	readonly reconciliationMode?: ResourceReconciliationMode;
	readonly options?: ResourceValueWriteOptions;
}

export interface ResourceTransferEffectParams {
	readonly donor: ResourceTransferEndpointPayload;
	readonly recipient: ResourceTransferEndpointPayload;
}

export interface ResourceUpperBoundIncreaseParams {
	readonly player?: ResourcePlayerScope;
	readonly resourceId: string;
	readonly delta: number;
}
