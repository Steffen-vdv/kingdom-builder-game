import type {
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
} from '@kingdom-builder/protocol';
import type { EffectDef } from '@kingdom-builder/engine/effects';

export const ON_PAY_UPKEEP_STEP = 'onPayUpkeepStep';
export const ON_GAIN_INCOME_STEP = 'onGainIncomeStep';
export const ON_GAIN_AP_STEP = 'onGainAPStep';

export const BROOM_ICON = '🧹';
export const RESOURCE_TRANSFER_ICON = '🔁';

export type Focus = 'economy' | 'aggressive' | 'defense' | 'other';

export interface Triggered {
	onGrowthPhase?: EffectDef[] | undefined;
	onUpkeepPhase?: EffectDef[] | undefined;
	onBeforeAttacked?: EffectDef[] | undefined;
	onAttackResolved?: EffectDef[] | undefined;
	onPayUpkeepStep?: EffectDef[] | undefined;
	onGainIncomeStep?: EffectDef[] | undefined;
	onGainAPStep?: EffectDef[] | undefined;
}

export interface PopulationDef extends PopulationConfig, Triggered {}
export interface DevelopmentDef extends DevelopmentConfig, Triggered {
	order?: number;
	focus?: Focus;
}
export interface BuildingDef extends BuildingConfig, Triggered {
	focus?: Focus;
}

export type TriggerKey = keyof Triggered;
