import type { RuntimeResourceBounds } from '../types';

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
	/**
	 * When additive is true, multiple changes in the same step are applied
	 * additively from the original base value rather than compounding.
	 */
	readonly additive?: boolean;
}

/**
 * Percent change that reads the percent value from another resource.
 * Used for growth mechanics where stat A increases by stat B percent.
 * When additive is true, multiple changes in the same step are applied
 * additively from the original base value rather than compounding.
 */
export interface ResourcePercentFromResourceParameters {
	readonly type: 'percentFromResource';
	readonly sourceResourceId: string;
	readonly roundingMode?: ResourceChangeRoundingMode;
	readonly additive?: boolean;
	/**
	 * Multiplier applied to the percent change, typically from evaluators
	 * that run the effect multiple times.
	 */
	readonly multiplier?: number;
}

export type ResourceChangeParameters =
	| ResourceAmountChangeParameters
	| ResourcePercentChangeParameters
	| ResourcePercentFromResourceParameters;

export interface ComputeResourceDeltaInput {
	readonly currentValue: number;
	readonly change: ResourceChangeParameters;
	/** For percentFromResource, provides access to other resource values */
	readonly getResourceValue?: (resourceId: string) => number;
}

export interface ResourceReconciliationInput extends ComputeResourceDeltaInput {
	readonly bounds?: RuntimeResourceBounds | null;
	readonly reconciliationMode: ResourceReconciliationMode;
}

export interface ResourceReconciliationResult {
	readonly requestedDelta: number;
	readonly appliedDelta: number;
	readonly finalValue: number;
	readonly clampedToLowerBound: boolean;
	readonly clampedToUpperBound: boolean;
}

/**
 * Strategy interface for reconciliation modes.
 * Each strategy receives the target value and bounds, and returns the
 * reconciliation result.
 */
export interface ReconciliationStrategy {
	(
		currentValue: number,
		targetValue: number,
		requestedDelta: number,
		bounds: RuntimeResourceBounds | null | undefined,
	): ResourceReconciliationResult;
}

/**
 * Error thrown when reject reconciliation mode encounters a value that would
 * exceed bounds. This error is intended to be caught during action simulation
 * to prevent invalid state from being applied.
 */
export class ResourceBoundExceededError extends Error {
	readonly boundType: 'lower' | 'upper';
	readonly targetValue: number;
	readonly boundValue: number;
	readonly requestedDelta: number;

	constructor(
		boundType: 'lower' | 'upper',
		targetValue: number,
		boundValue: number,
		requestedDelta: number,
	) {
		const direction = boundType === 'lower' ? 'below' : 'above';
		super(
			`Resource change rejected: target value ${targetValue} would be ` +
				`${direction} ${boundType} bound ${boundValue} ` +
				`(requested delta: ${requestedDelta})`,
		);
		this.name = 'ResourceBoundExceededError';
		this.boundType = boundType;
		this.targetValue = targetValue;
		this.boundValue = boundValue;
		this.requestedDelta = requestedDelta;
	}
}
