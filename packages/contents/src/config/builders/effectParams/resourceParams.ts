import type { ResourceKey } from '../../../resources';
import { ParamsBuilder } from '../../builderShared';

const RESOURCE_KEY_DUPLICATE =
	'You already chose a resource with key(). Remove the extra key() call.';
const RESOURCE_EXCLUSIVE =
	'Resource change cannot use both amount() and percent(). Choose one of them.';
const RESOURCE_AMOUNT_DUPLICATE =
	'You already set amount() for this resource change. Remove the duplicate amount() call.';
const RESOURCE_PERCENT_DUPLICATE =
	'You already set percent() for this resource change. Remove the duplicate percent() call.';
const RESOURCE_MISSING_KEY =
	'Resource change is missing key(). Call key(Resource.yourChoice) to choose what should change.';
const RESOURCE_MISSING_AMOUNT =
	'Resource change needs exactly one of amount() or percent(). Pick how much the resource should change.';

class ResourceEffectParamsBuilder extends ParamsBuilder<{
	key?: ResourceKey;
	amount?: number;
	percent?: number;
}> {
	key(key: ResourceKey) {
		return this.set('key', key, RESOURCE_KEY_DUPLICATE);
	}
	amount(amount: number) {
		if (this.wasSet('percent')) {
			throw new Error(RESOURCE_EXCLUSIVE);
		}
		return this.set('amount', amount, RESOURCE_AMOUNT_DUPLICATE);
	}
	percent(percent: number) {
		if (this.wasSet('amount')) {
			throw new Error(RESOURCE_EXCLUSIVE);
		}
		return this.set('percent', percent, RESOURCE_PERCENT_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('key')) {
			throw new Error(RESOURCE_MISSING_KEY);
		}
		if (!this.wasSet('amount') && !this.wasSet('percent')) {
			throw new Error(RESOURCE_MISSING_AMOUNT);
		}
		return super.build();
	}
}

export function resourceParams() {
	return new ResourceEffectParamsBuilder();
}
