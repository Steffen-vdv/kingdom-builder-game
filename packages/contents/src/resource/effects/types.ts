/**
 * Reconciliation mode constants for use with builders and effect configuration.
 * Use these instead of string literals for type safety and consistency.
 */
export const ReconciliationMode = {
	/** Clamp values to stay within bounds (default behavior) */
	CLAMP: 'clamp',
	/** Pass values through without bound checking (allows negative/overflow) */
	PASS: 'pass',
	/** Reject changes that would exceed bounds (throws error) */
	REJECT: 'reject',
} as const;

export type ResourceReconciliationMode = (typeof ReconciliationMode)[keyof typeof ReconciliationMode];

/**
 * All valid reconciliation modes as a Set for validation.
 */
export const VALID_RECONCILIATION_MODES: ReadonlySet<ResourceReconciliationMode> = new Set([ReconciliationMode.CLAMP, ReconciliationMode.PASS, ReconciliationMode.REJECT]);

/**
 * Rounding mode constants for use with builders and effect configuration.
 */
export const RoundingMode = {
	/** Round towards positive infinity (ceiling for positive, floor for neg) */
	UP: 'up',
	/** Round towards zero (floor for positive, ceiling for negative) */
	DOWN: 'down',
	/** Round to nearest integer */
	NEAREST: 'nearest',
} as const;

export type ResourceChangeRoundingMode = (typeof RoundingMode)[keyof typeof RoundingMode];

/**
 * All valid rounding modes as a Set for validation.
 */
export const VALID_ROUNDING_MODES: ReadonlySet<ResourceChangeRoundingMode> = new Set([RoundingMode.UP, RoundingMode.DOWN, RoundingMode.NEAREST]);

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
