import type { ResourceChangeEffectParams, ResourceChangeRoundingMode, ResourceChangeBuilder, ResourceReconciliationMode } from '../../../resourceV2';
import { resourceChange } from '../../../resourceV2';
import type { ResourceKey } from '../../../resources';
import { getResourceV2Id } from '../../../resources';
import { ParamsBuilder, type Params } from '../../builderShared';

const RESOURCE_KEY_DUPLICATE = 'You already chose a resource with key(). Remove the extra key() call.';
const RESOURCE_EXCLUSIVE = 'Resource change cannot use both amount() and percent(). Choose one of them.';
const RESOURCE_AMOUNT_DUPLICATE = 'You already set amount() for this resource change. Remove the duplicate amount() call.';
const RESOURCE_PERCENT_DUPLICATE = 'You already set percent() for this resource change. Remove the duplicate percent() call.';
const RESOURCE_MISSING_KEY = 'Resource change is missing key(). Call key(Resource.yourChoice) to choose what should change.';
const RESOURCE_MISSING_AMOUNT = 'Resource change needs exactly one of amount() or percent(). Pick how much the resource should change.';

type ResourceEffectParams = ResourceChangeEffectParams &
	Params & {
		key: ResourceKey;
		amount?: number;
		percent?: number;
	};

type ChangeMode = 'amount' | 'percent' | undefined;

class ResourceEffectParamsBuilder extends ParamsBuilder<ResourceEffectParams> {
	private resourceKey?: ResourceKey;
	private resourceId?: string;
	private changeBuilder?: ResourceChangeBuilder;
	private mode: ChangeMode;
	private amountValue?: number;
	private percentValue?: number;

	key(key: ResourceKey) {
		if (this.resourceKey) {
			throw new Error(RESOURCE_KEY_DUPLICATE);
		}
		const resourceId = getResourceV2Id(key);
		this.resourceKey = key;
		this.resourceId = resourceId;
		this.changeBuilder = resourceChange(resourceId);
		return this;
	}

	private ensureBuilder(method: string) {
		if (!this.changeBuilder || !this.resourceId || !this.resourceKey) {
			throw new Error(`Resource change ${method} requires key() before it can be configured.`);
		}
	}

	amount(amount: number) {
		this.ensureBuilder('amount()');
		if (this.mode === 'percent') {
			throw new Error(RESOURCE_EXCLUSIVE);
		}
		if (this.mode === 'amount') {
			throw new Error(RESOURCE_AMOUNT_DUPLICATE);
		}
		this.mode = 'amount';
		this.amountValue = amount;
		this.changeBuilder!.amount(amount);
		return this;
	}

	percent(percent: number) {
		this.ensureBuilder('percent()');
		if (this.mode === 'amount') {
			throw new Error(RESOURCE_EXCLUSIVE);
		}
		if (this.mode === 'percent') {
			throw new Error(RESOURCE_PERCENT_DUPLICATE);
		}
		this.mode = 'percent';
		this.percentValue = percent;
		this.changeBuilder!.percent(percent);
		return this;
	}

	roundingMode(mode: ResourceChangeRoundingMode) {
		this.ensureBuilder('roundingMode()');
		if (this.mode !== 'percent') {
			throw new Error('roundingMode() is only available after configuring percent().');
		}
		this.changeBuilder!.roundingMode(mode);
		return this;
	}

	reconciliation(mode?: ResourceReconciliationMode) {
		this.ensureBuilder('reconciliation()');
		this.changeBuilder!.reconciliation(mode);
		return this;
	}

	suppressHooks(enabled = true) {
		this.ensureBuilder('suppressHooks()');
		this.changeBuilder!.suppressHooks(enabled);
		return this;
	}

	override build() {
		if (!this.changeBuilder || !this.resourceKey || !this.resourceId) {
			throw new Error(RESOURCE_MISSING_KEY);
		}
		if (this.mode === undefined) {
			throw new Error(RESOURCE_MISSING_AMOUNT);
		}
		const built = this.changeBuilder.build();
		const legacyParams: { amount?: number; percent?: number } = {};
		if (this.mode === 'amount') {
			legacyParams.amount = this.amountValue!;
		} else if (this.mode === 'percent') {
			legacyParams.percent = this.percentValue!;
		}
		this.params = {
			...built,
			key: this.resourceKey,
			...legacyParams,
		} as ResourceEffectParams;
		return super.build();
	}
}

export function resourceParams() {
	return new ResourceEffectParamsBuilder();
}
