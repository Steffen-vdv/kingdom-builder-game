import type { ResourceChangeBuilder, ResourceChangeEffectParams, ResourceChangeRoundingMode, ResourceReconciliationMode } from '../../../resourceV2';
import { resourceChange } from '../../../resourceV2';
import type { StatKey } from '../../../stats';
import { getStatResourceV2Id } from '../../../stats';
import { ParamsBuilder, type Params } from '../../builderShared';

const STAT_KEY_DUPLICATE = 'You already chose a stat with key(). Remove the extra key() call.';
const STAT_AMOUNT_EXCLUSIVE = 'Stat change cannot mix amount() with percent() or percentFromStat(). Pick one approach to describe the change.';
const STAT_PERCENT_EXCLUSIVE = 'Stat change cannot mix percent() with amount() or percentFromStat(). Pick one approach to describe the change.';
const STAT_PERCENT_FROM_STAT_EXCLUSIVE = 'Stat change cannot mix percentFromStat() with amount() or percent(). Pick one approach to describe the change.';
const STAT_AMOUNT_DUPLICATE = 'You already set amount() for this stat change. Remove the duplicate amount() call.';
const STAT_PERCENT_DUPLICATE = 'You already set percent() for this stat change. Remove the duplicate percent() call.';
const STAT_PERCENT_FROM_STAT_DUPLICATE = 'You already chose a stat source with percentFromStat(). Remove the duplicate percentFromStat() call.';
const STAT_MISSING_KEY = 'Stat change is missing key(). Call key(Stat.yourChoice) to decide which stat should change.';
const STAT_MISSING_AMOUNT = 'Stat change needs amount(), percent(), or percentFromStat(). Choose one to describe how the stat should change.';

type StatResourceEffectParams = ResourceChangeEffectParams &
	Params & {
		key: StatKey;
		amount?: number;
		percent?: number;
		percentStat?: StatKey;
	};

type StatChangeMode = 'amount' | 'percent' | 'percentStat' | undefined;

class StatEffectParamsBuilder extends ParamsBuilder<StatResourceEffectParams> {
	private statKey?: StatKey;
	private resourceId?: string;
	private changeBuilder?: ResourceChangeBuilder;
	private mode: StatChangeMode;
	private amountValue?: number;
	private percentValue?: number;
	private percentStatKey?: StatKey;

	key(key: StatKey) {
		if (this.statKey) {
			throw new Error(STAT_KEY_DUPLICATE);
		}
		const resourceId = getStatResourceV2Id(key);
		this.statKey = key;
		this.resourceId = resourceId;
		this.changeBuilder = resourceChange(resourceId);
		return this;
	}

	private ensureBuilder(method: string) {
		if (!this.changeBuilder || !this.statKey || !this.resourceId) {
			throw new Error(`Stat change ${method} requires key() before it can be configured.`);
		}
	}

	amount(amount: number) {
		this.ensureBuilder('amount()');
		if (this.mode && this.mode !== 'amount') {
			throw new Error(STAT_AMOUNT_EXCLUSIVE);
		}
		if (this.mode === 'amount') {
			throw new Error(STAT_AMOUNT_DUPLICATE);
		}
		this.mode = 'amount';
		this.amountValue = amount;
		this.changeBuilder!.amount(amount);
		return this;
	}

	percent(percent: number) {
		this.ensureBuilder('percent()');
		if (this.mode && this.mode !== 'percent') {
			throw new Error(STAT_PERCENT_EXCLUSIVE);
		}
		if (this.mode === 'percent') {
			throw new Error(STAT_PERCENT_DUPLICATE);
		}
		this.mode = 'percent';
		this.percentValue = percent;
		this.changeBuilder!.percent(percent);
		return this;
	}

	percentFromStat(stat: StatKey) {
		this.ensureBuilder('percentFromStat()');
		if (this.mode && this.mode !== 'percentStat') {
			throw new Error(STAT_PERCENT_FROM_STAT_EXCLUSIVE);
		}
		if (this.mode === 'percentStat') {
			throw new Error(STAT_PERCENT_FROM_STAT_DUPLICATE);
		}
		this.mode = 'percentStat';
		this.percentStatKey = stat;
		this.changeBuilder!.percent(0);
		return this;
	}

	roundingMode(mode: ResourceChangeRoundingMode) {
		this.ensureBuilder('roundingMode()');
		if (this.mode !== 'percent' && this.mode !== 'percentStat') {
			throw new Error('roundingMode() is only available after configuring percent() or percentFromStat().');
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
		if (!this.changeBuilder || !this.statKey || !this.resourceId) {
			throw new Error(STAT_MISSING_KEY);
		}
		if (!this.mode) {
			throw new Error(STAT_MISSING_AMOUNT);
		}
		const built = this.changeBuilder.build();
		const legacyParams: { amount?: number; percent?: number; percentStat?: StatKey } = {};
		if (this.mode === 'amount') {
			legacyParams.amount = this.amountValue!;
		} else if (this.mode === 'percent') {
			legacyParams.percent = this.percentValue!;
		} else if (this.mode === 'percentStat') {
			legacyParams.percentStat = this.percentStatKey!;
		}
		this.params = {
			...built,
			key: this.statKey,
			...legacyParams,
		} as StatResourceEffectParams;
		return super.build();
	}
}

export function statParams() {
	return new StatEffectParamsBuilder();
}
