const BUILDER_NAME = 'ResourceV2 effect change builder';

export type ResourceV2ReconciliationMode = 'clamp' | 'pass' | 'reject';

export type ResourceV2ChangeRoundingMode = 'up' | 'down' | 'nearest';

export interface ResourceV2AmountChangeConfig {
	readonly type: 'amount';
	readonly amount: number;
}

export interface ResourceV2PercentChangeConfig {
	readonly type: 'percent';
	readonly modifiers: readonly number[];
	readonly roundingMode?: ResourceV2ChangeRoundingMode;
}

export type ResourceV2ChangeConfig = ResourceV2AmountChangeConfig | ResourceV2PercentChangeConfig;

export interface ResourceV2ChangeParams {
	readonly resourceId: string;
	readonly change: ResourceV2ChangeConfig;
	readonly reconciliation?: ResourceV2ReconciliationMode;
	readonly suppressHooks?: boolean;
}

export interface ResourceV2ChangeBuilder {
	amount(amount: number): this;
	percent(modifier: number, ...additional: number[]): this;
	round(mode: ResourceV2ChangeRoundingMode): this;
	reconciliation(mode: ResourceV2ReconciliationMode): this;
	suppressHooks(enabled?: boolean): this;
	build(): ResourceV2ChangeParams;
}

type MutablePercentChangeConfig = {
	type: 'percent';
	modifiers: number[];
	roundingMode?: ResourceV2ChangeRoundingMode;
};

type MutableChangeConfig = ResourceV2AmountChangeConfig | MutablePercentChangeConfig;

function assertFinite(value: number, field: string) {
	if (!Number.isFinite(value)) {
		throw new Error(`${BUILDER_NAME} expected ${field} to be a finite number but received ${value}.`);
	}
}

class ResourceV2ChangeBuilderImpl implements ResourceV2ChangeBuilder {
	private readonly resourceId: string;
	private change?: MutableChangeConfig;
	private reconciliationMode: ResourceV2ReconciliationMode = 'clamp';
	private suppressHooksFlag?: boolean;

	constructor(resourceId: string) {
		if (typeof resourceId !== 'string' || resourceId.length === 0) {
			throw new Error(`${BUILDER_NAME} requires a non-empty resourceId.`);
		}
		this.resourceId = resourceId;
	}

	private ensureAmountChange() {
		if (this.change) {
			throw new Error(`${BUILDER_NAME} amount() cannot be combined with percent(). Remove the conflicting call.`);
		}
	}

	private ensurePercentChange() {
		const current = this.change;
		if (!current) {
			const percentChange: MutablePercentChangeConfig = {
				type: 'percent',
				modifiers: [],
			};
			this.change = percentChange;
			return percentChange;
		}
		if (current.type !== 'percent') {
			throw new Error(`${BUILDER_NAME} percent() cannot be combined with amount(). Remove the conflicting call.`);
		}
		return current;
	}

	amount(amount: number) {
		this.ensureAmountChange();
		assertFinite(amount, 'amount');
		this.change = { type: 'amount', amount };
		return this;
	}

	percent(modifier: number, ...additional: number[]) {
		const target = this.ensurePercentChange();
		const modifiers = [modifier, ...additional];
		if (modifiers.length === 0) {
			throw new Error(`${BUILDER_NAME} percent() requires at least one modifier.`);
		}
		for (const value of modifiers) {
			assertFinite(value, 'percent modifier');
			target.modifiers.push(value);
		}
		return this;
	}

	round(mode: ResourceV2ChangeRoundingMode) {
		if (!this.change || this.change.type !== 'percent') {
			throw new Error(`${BUILDER_NAME} round() can only be used with percent() changes.`);
		}
		this.change.roundingMode = mode;
		return this;
	}

	reconciliation(mode: ResourceV2ReconciliationMode) {
		this.reconciliationMode = mode;
		return this;
	}

	suppressHooks(enabled = true) {
		this.suppressHooksFlag = enabled ?? true;
		return this;
	}

	build(): ResourceV2ChangeParams {
		if (!this.change) {
			throw new Error(`${BUILDER_NAME} requires amount() or percent() before build().`);
		}
		if (this.change.type === 'percent' && this.change.modifiers.length === 0) {
			throw new Error(`${BUILDER_NAME} percent() requires at least one modifier before build().`);
		}
		const params: ResourceV2ChangeParams = {
			resourceId: this.resourceId,
			change:
				this.change.type === 'percent'
					? {
							type: 'percent',
							modifiers: [...this.change.modifiers],
							...(this.change.roundingMode ? { roundingMode: this.change.roundingMode } : {}),
						}
					: { type: 'amount', amount: this.change.amount },
			reconciliation: this.reconciliationMode,
		};
		if (this.suppressHooksFlag === undefined) {
			return params;
		}
		return {
			...params,
			suppressHooks: this.suppressHooksFlag,
		};
	}
}

export function resourceChange(resourceId: string): ResourceV2ChangeBuilder {
	return new ResourceV2ChangeBuilderImpl(resourceId);
}
