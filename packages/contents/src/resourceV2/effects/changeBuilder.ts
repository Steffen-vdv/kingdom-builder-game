import type { ResourceChangeParameters, ResourceChangeRoundingMode, ResourceReconciliationMode } from './types';

const BUILDER_NAME = 'ResourceV2 change builder';

const SUPPORTED_RECONCILIATION_MODES: ReadonlySet<ResourceReconciliationMode> = new Set(['clamp']);

type ChangeKind = ResourceChangeParameters['type'];

export interface ResourceChangeEffectParams {
	readonly resourceId: string;
	readonly change: ResourceChangeParameters;
	readonly reconciliation?: ResourceReconciliationMode;
	readonly suppressHooks?: boolean;
}

export interface ResourceChangeBuilder {
	amount(amount: number): this;
	percent(modifier: number, ...additional: readonly number[]): this;
	roundingMode(mode: ResourceChangeRoundingMode): this;
	reconciliation(mode?: ResourceReconciliationMode): this;
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
		if (this.changeKind !== 'percent') {
			throw new Error(`${BUILDER_NAME} roundingMode() requires percent() to be configured first. Add percent() before roundingMode().`);
		}
		this.rounding = mode;
		return this;
	}

	reconciliation(mode: ResourceReconciliationMode = 'clamp') {
		if (!SUPPORTED_RECONCILIATION_MODES.has(mode)) {
			throw new Error(`${BUILDER_NAME} reconciliation mode "${mode}" is not supported yet. Supported modes: clamp.`);
		}
		this.reconciliationMode = mode;
		return this;
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
				change: { type: 'amount', amount: this.amountValue },
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
