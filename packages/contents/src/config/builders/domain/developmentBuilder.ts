import type { EffectConfig } from '@kingdom-builder/protocol';
import type { DevelopmentDef, Focus } from '../../../defs';
import type { ResourceKey } from '../../../resources';
import { BaseBuilder } from './baseBuilder';

type DevelopmentEffectKey = 'onBuild' | 'onGrowthPhase' | 'onPayUpkeepStep' | 'onGainIncomeStep' | 'onGainAPStep' | 'onBeforeAttacked' | 'onAttackResolved';

export class DevelopmentBuilder extends BaseBuilder<DevelopmentDef> {
	constructor() {
		super({}, 'Development');
	}

	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		const upkeep = this.config.upkeep as Record<ResourceKey, number>;
		upkeep[key] = amount;
		return this;
	}

	populationCap(amount: number) {
		this.config.populationCap = amount;
		return this;
	}

	private pushEffect(key: DevelopmentEffectKey, effect: EffectConfig) {
		const list = (this.config[key] as EffectConfig[] | undefined) || [];
		list.push(effect);
		this.config[key] = list as DevelopmentDef[DevelopmentEffectKey];
		return this;
	}

	onBuild(effect: EffectConfig) {
		return this.pushEffect('onBuild', effect);
	}

	onGrowthPhase(effect: EffectConfig) {
		return this.pushEffect('onGrowthPhase', effect);
	}

	onPayUpkeepStep(effect: EffectConfig) {
		return this.pushEffect('onPayUpkeepStep', effect);
	}

	onGainIncomeStep(effect: EffectConfig) {
		return this.pushEffect('onGainIncomeStep', effect);
	}

	onGainAPStep(effect: EffectConfig) {
		return this.pushEffect('onGainAPStep', effect);
	}

	onBeforeAttacked(effect: EffectConfig) {
		return this.pushEffect('onBeforeAttacked', effect);
	}

	onAttackResolved(effect: EffectConfig) {
		return this.pushEffect('onAttackResolved', effect);
	}

	system(flag = true) {
		this.config.system = flag;
		return this;
	}

	order(order: number) {
		this.config.order = order;
		return this;
	}

	focus(focus: Focus) {
		this.config.focus = focus;
		return this;
	}
}
