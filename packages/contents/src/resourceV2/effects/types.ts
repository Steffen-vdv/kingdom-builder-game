// Import and re-export reconciliation types from the shared module
import { ReconciliationMode, VALID_RECONCILIATION_MODES, type ResourceReconciliationMode } from '../reconciliation';

export { ReconciliationMode, VALID_RECONCILIATION_MODES, type ResourceReconciliationMode };

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

export type ResourceV2PlayerScope = 'active' | 'opponent';

export interface ResourceV2ValueWriteOptions {
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
