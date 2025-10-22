import type {
	ResourceV2ReconciliationStrategy,
	ResourceV2RoundingMode,
	ResourceV2ValueDelta,
} from '@kingdom-builder/protocol';

interface ResourceV2ValueDeltaBuilderOptions {
	requiresReconciliation?: boolean;
}

export class ResourceV2ValueDeltaBuilder {
	private readonly config: Partial<ResourceV2ValueDelta>;
	private readonly requiresReconciliation: boolean;
	private amountSet = false;
	private percentSet = false;
	private reconciliationSet = false;
	private suppressHooksSet = false;

	constructor(
		resourceId: string,
		options?: ResourceV2ValueDeltaBuilderOptions,
	) {
		this.config = { resourceId };
		this.requiresReconciliation = options?.requiresReconciliation ?? false;
	}

	amount(amount: number) {
		if (this.amountSet) {
			throw new Error(
				'Resource value delta already set amount(). Remove the duplicate amount() call.',
			);
		}
		if (this.percentSet) {
			throw new Error(
				'Resource value delta already set percent(). Remove it before calling amount().',
			);
		}
		this.config.amount = amount;
		this.amountSet = true;
		return this;
	}

	percent(percent: number, rounding: ResourceV2RoundingMode) {
		if (this.percentSet) {
			throw new Error(
				'Resource value delta already set percent(). Remove the duplicate percent() call.',
			);
		}
		if (this.amountSet) {
			throw new Error(
				'Resource value delta already set amount(). Remove it before calling percent().',
			);
		}
		if (!rounding) {
			throw new Error(
				'Resource value delta percent() requires a rounding mode.',
			);
		}
		this.config.percent = percent;
		this.config.rounding = rounding;
		this.percentSet = true;
		return this;
	}

	reconciliation(strategy: ResourceV2ReconciliationStrategy) {
		if (this.reconciliationSet) {
			throw new Error(
				'Resource value delta already set reconciliation(). Remove the duplicate call.',
			);
		}
		this.config.reconciliation = strategy;
		this.reconciliationSet = true;
		return this;
	}

	suppressHooks(reason: string) {
		if (!reason || !reason.trim()) {
			throw new Error(
				'Resource value delta suppressHooks() requires a non-empty justification string.',
			);
		}
		if (this.suppressHooksSet) {
			throw new Error(
				'Resource value delta already set suppressHooks(). Remove the duplicate call.',
			);
		}
		this.config.suppressHooks = true;
		this.suppressHooksSet = true;
		return this;
	}

	build(): ResourceV2ValueDelta {
		if (!this.amountSet && !this.percentSet) {
			throw new Error(
				'Resource value delta must specify amount() or percent() before build().',
			);
		}
		if (this.percentSet && !this.config.rounding) {
			throw new Error(
				'Resource value delta percent() requires rounding to be specified.',
			);
		}
		if (this.requiresReconciliation && !this.reconciliationSet) {
			throw new Error(
				'Resource value delta targeting bounded resources must set reconciliation().',
			);
		}
		return this.config as ResourceV2ValueDelta;
	}
}

export type { ResourceV2ValueDeltaBuilderOptions };
