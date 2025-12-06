import type { EffectConfig, PopulationConfig } from '@kingdom-builder/protocol';
import type { ResourceKey } from '../../../resourceKeys';
import { BaseBuilder } from './baseBuilder';

type PopulationEffectKey = 'onAssigned' | 'onUnassigned' | 'onGrowthPhase' | 'onUpkeepPhase' | 'onPayUpkeepStep' | 'onGainIncomeStep' | 'onGainAPStep';

export class PopulationBuilder extends BaseBuilder<PopulationConfig> {
	constructor() {
		super({}, 'Population');
	}

	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		const upkeep = this.config.upkeep as Record<ResourceKey, number>;
		upkeep[key] = amount;
		return this;
	}

	private pushEffect(key: PopulationEffectKey, effect: EffectConfig) {
		const list = (this.config[key] as EffectConfig[] | undefined) || [];
		list.push(effect);
		this.config[key] = list as PopulationConfig[PopulationEffectKey];
		return this;
	}

	onAssigned(effect: EffectConfig) {
		return this.pushEffect('onAssigned', effect);
	}

	onUnassigned(effect: EffectConfig) {
		return this.pushEffect('onUnassigned', effect);
	}

	onGrowthPhase(effect: EffectConfig) {
		return this.pushEffect('onGrowthPhase', effect);
	}

	onUpkeepPhase(effect: EffectConfig) {
		return this.pushEffect('onUpkeepPhase', effect);
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
}
