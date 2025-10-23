export type ResourceV2ReconciliationStrategy = 'clamp';
export type ResourceV2RoundingMode = 'up' | 'down' | 'nearest';

export type ResourceV2ValuePayload =
	| { kind: 'amount'; amount: number }
	| { kind: 'percent'; percent: number; rounding: ResourceV2RoundingMode };

export interface ResourceV2ValueEffectParams extends Record<string, unknown> {
	resourceId: string;
	payload: ResourceV2ValuePayload;
	reconciliation: ResourceV2ReconciliationStrategy;
	suppressHooks?: boolean;
}

export interface ResourceV2TransferEndpointParams
	extends Record<string, unknown> {
	resourceId: string;
	reconciliation: ResourceV2ReconciliationStrategy;
}

export interface ResourceV2TransferEffectParams
	extends Record<string, unknown> {
	donor: ResourceV2TransferEndpointParams;
	recipient: ResourceV2TransferEndpointParams;
	payload: ResourceV2ValuePayload;
	suppressHooks?: boolean;
}

export interface ResourceV2BoundAdjustmentParams
	extends Record<string, unknown> {
	resourceId: string;
	amount: number;
	reconciliation: ResourceV2ReconciliationStrategy;
}
