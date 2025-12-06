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

export interface ResourcePercentFromResourceChangeParameters {
	readonly type: 'percentFromResource';
	readonly sourceResourceId: string;
	readonly roundingMode?: ResourceChangeRoundingMode;
	readonly additive?: boolean;
}

export type ResourceChangeParameters = ResourceAmountChangeParameters | ResourcePercentChangeParameters | ResourcePercentFromResourceChangeParameters;

export type ResourceV2PlayerScope = 'active' | 'opponent';

export interface ResourceV2ValueWriteOptions {
	readonly suppressTouched?: boolean;
	readonly suppressRecentEntry?: boolean;
	readonly skipTierUpdate?: boolean;
}

export interface ResourceV2TransferEndpointPayload {
	readonly player?: ResourceV2PlayerScope;
	readonly resourceId: string;
	readonly change: ResourceChangeParameters;
	readonly reconciliationMode?: ResourceReconciliationMode;
	readonly options?: ResourceV2ValueWriteOptions;
}

export interface ResourceV2TransferEffectParams {
	readonly donor: ResourceV2TransferEndpointPayload;
	readonly recipient: ResourceV2TransferEndpointPayload;
}

export interface ResourceV2UpperBoundIncreaseParams {
	readonly player?: ResourceV2PlayerScope;
	readonly resourceId: string;
	readonly delta: number;
}
