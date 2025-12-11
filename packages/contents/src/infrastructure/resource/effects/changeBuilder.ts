import {
	ReconciliationMode,
	RoundingMode,
	VALID_RECONCILIATION_MODES,
	VALID_ROUNDING_MODES,
	type ResourceChangeParameters,
	type ResourceChangeRoundingMode,
	type ResourceReconciliationMode,
} from './types';

const BUILDER_NAME = 'Resource change builder';

type ChangeKind = ResourceChangeParameters['type'];

export interface ResourceChangeEffectParams extends Record<string, unknown> {
	readonly resourceId: string;
	readonly change: ResourceChangeParameters;
	readonly reconciliation?: ResourceReconciliationMode;
	readonly suppressHooks?: boolean;
}

export interface ResourceChangeBuilder {
	amount(amount: number): this;
	percent(modifier: number, ...additional: readonly number[]): this;
	/** Set rounding mode using a string value */
	roundingMode(mode: ResourceChangeRoundingMode): this;
	/** Convenience: round towards positive infinity */
	roundUp(): this;
	/** Convenience: round towards zero */
	roundDown(): this;
	/** Convenience: round to nearest integer */
	roundNearest(): this;
	/** Set reconciliation mode using a string value */
	reconciliation(mode?: ResourceReconciliationMode): this;
	/** Convenience: clamp values to stay within bounds (default) */
	clamp(): this;
	/** Convenience: pass values through without bound checking */
	pass(): this;
	/** Convenience: reject changes that would exceed bounds */
	reject(): this;
	suppressHooks(enabled?: boolean): this;
	build(): ResourceChangeEffectParams;
}

function assertFiniteNumber(value: number, field: string) {
	if (!Number.isFinite(value)) {
		throw new Error(`${BUILDER_NAME} expected ${field} to be a finite number but received ${value}.`);
	}
}

class ResourceChangeBuilderImpl implements ResourceChangeBuilder {
	private readonly resourceId: string;
	private changeKind?: ChangeKind;
	private amountValue?: number;
	private percentModifiers: number[] = [];
	private rounding?: ResourceChangeRoundingMode;
	private reconciliationMode?: ResourceReconciliationMode;
	private suppressHooksFlag?: boolean;

	constructor(resourceId: string) {
		if (!resourceId) {
			throw new Error(`${BUILDER_NAME} requires a non-empty resourceId.`);
		}
		this.resourceId = resourceId;
	}

	private ensureChangeKind(target: ChangeKind) {
		if (this.changeKind && this.changeKind !== target) {
			throw new Error(`${BUILDER_NAME} cannot mix amount() and percent(). Remove the existing ${this.changeKind}() call before switching.`);
		}
		this.changeKind = target;
	}

	amount(amount: number) {
		this.ensureChangeKind('amount');
		assertFiniteNumber(amount, 'amount');
		this.amountValue = amount;
		return this;
	}

	percent(modifier: number, ...additional: readonly number[]) {
		this.ensureChangeKind('percent');
		const modifiers = [modifier, ...additional];
		if (modifiers.length === 0) {
			throw new Error(`${BUILDER_NAME} percent() requires at least one modifier.`);
		}
		modifiers.forEach((value, index) => {
			assertFiniteNumber(value, `percent modifier at position ${index}`);
		});
		this.percentModifiers.push(...modifiers);
		return this;
	}

	roundingMode(mode: ResourceChangeRoundingMode) {
		if (!this.changeKind) {
			throw new Error(`${BUILDER_NAME} roundingMode() requires amount() or percent() ` + `to be configured first.`);
		}
		if (!VALID_ROUNDING_MODES.has(mode)) {
			throw new Error(`${BUILDER_NAME} rounding mode "${mode}" is invalid. ` + `Valid modes: ${[...VALID_ROUNDING_MODES].join(', ')}.`);
		}
		this.rounding = mode;
		return this;
	}

	roundUp() {
		return this.roundingMode(RoundingMode.UP);
	}

	roundDown() {
		return this.roundingMode(RoundingMode.DOWN);
	}

	roundNearest() {
		return this.roundingMode(RoundingMode.NEAREST);
	}

	reconciliation(mode: ResourceReconciliationMode = ReconciliationMode.CLAMP) {
		if (!VALID_RECONCILIATION_MODES.has(mode)) {
			throw new Error(`${BUILDER_NAME} reconciliation mode "${mode}" is invalid. ` + `Valid modes: ${[...VALID_RECONCILIATION_MODES].join(', ')}.`);
		}
		this.reconciliationMode = mode;
		return this;
	}

	clamp() {
		return this.reconciliation(ReconciliationMode.CLAMP);
	}

	pass() {
		return this.reconciliation(ReconciliationMode.PASS);
	}

	reject() {
		return this.reconciliation(ReconciliationMode.REJECT);
	}

	suppressHooks(enabled = true) {
		this.suppressHooksFlag = enabled ?? true;
		return this;
	}

	build(): ResourceChangeEffectParams {
		if (!this.changeKind) {
			throw new Error(`${BUILDER_NAME} requires amount() or percent() before build().`);
		}

		if (this.changeKind === 'amount') {
			if (this.amountValue === undefined) {
				throw new Error(`${BUILDER_NAME} amount() must be called with a numeric value.`);
			}
			return {
				resourceId: this.resourceId,
				change: {
					type: 'amount',
					amount: this.amountValue,
					...(this.rounding ? { roundingMode: this.rounding } : {}),
				},
				...(this.reconciliationMode ? { reconciliation: this.reconciliationMode } : {}),
				...(this.suppressHooksFlag ? { suppressHooks: true } : {}),
			};
		}

		if (this.percentModifiers.length === 0) {
			throw new Error(`${BUILDER_NAME} percent() requires at least one modifier.`);
		}

		return {
			resourceId: this.resourceId,
			change: {
				type: 'percent',
				modifiers: [...this.percentModifiers],
				...(this.rounding ? { roundingMode: this.rounding } : {}),
			},
			...(this.reconciliationMode ? { reconciliation: this.reconciliationMode } : {}),
			...(this.suppressHooksFlag ? { suppressHooks: true } : {}),
		};
	}
}

export function resourceChange(resourceId: string): ResourceChangeBuilder {
	return new ResourceChangeBuilderImpl(resourceId);
}
