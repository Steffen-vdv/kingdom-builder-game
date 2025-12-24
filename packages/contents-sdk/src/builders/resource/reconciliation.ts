/**
 * Reconciliation mode constants for builders and effect configuration.
 * Use these instead of string literals for type safety and consistency.
 *
 * These modes apply to:
 * - Effect-level reconciliation (overflow/underflow bounds)
 * - Bound-level reconciliation (when a dynamic bound changes)
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

/** All valid reconciliation modes as a Set for validation. */
type ModeSet = ReadonlySet<ResourceReconciliationMode>;
export const VALID_RECONCILIATION_MODES: ModeSet = new Set([
	ReconciliationMode.CLAMP,
	ReconciliationMode.PASS,
	ReconciliationMode.REJECT,
]);
