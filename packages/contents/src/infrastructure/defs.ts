import type { BuildingConfig, DevelopmentConfig, EffectDef, PopulationConfig } from '@kingdom-builder/protocol';

export const BROOM_ICON = '🧹';
export const RESOURCE_TRANSFER_ICON = '🔁';

export const Focus = {
	Economy: 'economy',
	Aggressive: 'aggressive',
	Defense: 'defense',
	Other: 'other',
} as const;

export type Focus = (typeof Focus)[keyof typeof Focus];

export interface Triggered {
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
