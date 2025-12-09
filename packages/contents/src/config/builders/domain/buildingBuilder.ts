import type { EffectConfig } from '@kingdom-builder/protocol';
import type { BuildingDef, Focus } from '../../../defs';
import type { ResourceKey } from '../../../internal';
import { BaseBuilder } from './baseBuilder';

type BuildingEffectKey = 'onBuild' | 'onPayUpkeepStep' | 'onGainIncomeStep' | 'onGainAPStep' | 'onBeforeAttacked' | 'onAttackResolved';

export class BuildingBuilder extends BaseBuilder<BuildingDef> {
	constructor() {
		super(
			{
				costs: {} as Record<ResourceKey, number>,
				onBuild: [],
			},
			'Building',
		);
		// AP cost is handled automatically by the global action cost resource
		// system. Buildings should only specify non-AP resource costs.
	}

	cost(key: ResourceKey, amount: number) {
		this.config.costs[key] = amount;
		return this;
	}

	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		const upkeep = this.config.upkeep as Record<ResourceKey, number>;
		upkeep[key] = amount;
		return this;
	}

	private pushEffect(key: BuildingEffectKey, effect: EffectConfig) {
		const list = (this.config[key] as EffectConfig[] | undefined) || [];
		list.push(effect);
		this.config[key] = list as BuildingDef[BuildingEffectKey];
		return this;
	}

	onBuild(effect: EffectConfig) {
		return this.pushEffect('onBuild', effect);
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

	focus(focus: Focus) {
		this.config.focus = focus;
		return this;
	}
}
