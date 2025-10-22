import type { StatKey } from '../../../stats';
import { ParamsBuilder } from '../../builderShared';

const STAT_KEY_DUPLICATE = 'You already chose a stat with key(). Remove the extra key() call.';
const STAT_AMOUNT_EXCLUSIVE = 'Stat change cannot mix amount() with percent() or percentFromStat(). Pick one approach to describe the change.';
const STAT_PERCENT_EXCLUSIVE = 'Stat change cannot mix percent() with amount() or percentFromStat(). Pick one approach to describe the change.';
const STAT_PERCENT_FROM_STAT_EXCLUSIVE = 'Stat change cannot mix percentFromStat() with amount() or percent(). Pick one approach to describe the change.';
const STAT_AMOUNT_DUPLICATE = 'You already set amount() for this stat change. Remove the duplicate amount() call.';
const STAT_PERCENT_DUPLICATE = 'You already set percent() for this stat change. Remove the duplicate percent() call.';
const STAT_PERCENT_FROM_STAT_DUPLICATE = 'You already chose a stat source with percentFromStat(). Remove the duplicate percentFromStat() call.';
const STAT_MISSING_KEY = 'Stat change is missing key(). Call key(Stat.yourChoice) to decide which stat should change.';
const STAT_MISSING_AMOUNT = 'Stat change needs amount(), percent(), or percentFromStat(). Choose one to describe how the stat should change.';

class StatEffectParamsBuilder extends ParamsBuilder<{
	key?: StatKey;
	amount?: number;
	percent?: number;
	percentStat?: StatKey;
}> {
	key(key: StatKey) {
		return this.set('key', key, STAT_KEY_DUPLICATE);
	}
	amount(amount: number) {
		if (this.wasSet('percent') || this.wasSet('percentStat')) {
			throw new Error(STAT_AMOUNT_EXCLUSIVE);
		}
		return this.set('amount', amount, STAT_AMOUNT_DUPLICATE);
	}
	percent(percent: number) {
		if (this.wasSet('amount') || this.wasSet('percentStat')) {
			throw new Error(STAT_PERCENT_EXCLUSIVE);
		}
		return this.set('percent', percent, STAT_PERCENT_DUPLICATE);
	}
	percentFromStat(stat: StatKey) {
		if (this.wasSet('amount') || this.wasSet('percent')) {
			throw new Error(STAT_PERCENT_FROM_STAT_EXCLUSIVE);
		}
		return this.set('percentStat', stat, STAT_PERCENT_FROM_STAT_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('key')) {
			throw new Error(STAT_MISSING_KEY);
		}
		if (!this.wasSet('amount') && !this.wasSet('percent') && !this.wasSet('percentStat')) {
			throw new Error(STAT_MISSING_AMOUNT);
		}
		return super.build();
	}
}

export function statParams() {
	return new StatEffectParamsBuilder();
}
