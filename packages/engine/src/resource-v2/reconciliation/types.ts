/**
 * Resolved bounds where all dynamic references have been resolved to numbers.
 * Strategies work with these resolved values, keeping them simple and pure.
 */
export interface ResolvedBounds {
	readonly lowerBound: number | null;
	readonly upperBound: number | null;
}

/**
 * Reconciliation mode constants for runtime validation and use.
 */
export const ReconciliationMode = {
	/** Clamp values to stay within bounds (default behavior) */
	CLAMP: 'clamp',
	/** Pass values through without bound checking (allows negative/overflow) */
	PASS: 'pass',
	/** Reject changes that would exceed bounds (throws error) */
	REJECT: 'reject',
} as const;

export type ResourceReconciliationMode =
	(typeof ReconciliationMode)[keyof typeof ReconciliationMode];

/**
 * All valid reconciliation modes as a Set for runtime validation.
 */
type ReconciliationModeSet = ReadonlySet<ResourceReconciliationMode>;
export const VALID_RECONCILIATION_MODES: ReconciliationModeSet = new Set([
	ReconciliationMode.CLAMP,
	ReconciliationMode.PASS,
	ReconciliationMode.REJECT,
]);

/**
 * Rounding mode constants for runtime validation and use.
 */
export const RoundingMode = {
	/** Round towards positive infinity (ceiling for positive, floor for neg) */
	UP: 'up',
	/** Round towards zero (floor for positive, ceiling for negative) */
	DOWN: 'down',
	/** Round to nearest integer */
	NEAREST: 'nearest',
} as const;

export type ResourceChangeRoundingMode =
	(typeof RoundingMode)[keyof typeof RoundingMode];

/**
 * All valid rounding modes as a Set for runtime validation.
 */
export const VALID_ROUNDING_MODES: ReadonlySet<ResourceChangeRoundingMode> =
	new Set([RoundingMode.UP, RoundingMode.DOWN, RoundingMode.NEAREST]);

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
	/** Resolved bounds where dynamic references have been resolved to numbers */
	readonly bounds?: ResolvedBounds | null;
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
 * Each strategy receives the target value and RESOLVED bounds, and returns the
 * reconciliation result. Bounds must be resolved before calling strategies.
 */
export interface ReconciliationStrategy {
	(
		currentValue: number,
		targetValue: number,
		requestedDelta: number,
		bounds: ResolvedBounds | null | undefined,
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
