import type { BuildingConfig, DevelopmentConfig, EffectDef } from '@kingdom-builder/protocol';
import { Focus, type FocusValue } from '../constants';

export const BROOM_ICON = '🧹';
export const GENERAL_RESOURCE_ICON = '🧺';
export const RESOURCE_TRANSFER_ICON = '🔁';

// Re-export Focus from constants (single source of truth)
export { Focus };
export type Focus = FocusValue;

export interface Triggered {
	onBeforeAttacked?: EffectDef[] | undefined;
	onAttackResolved?: EffectDef[] | undefined;
	onPayUpkeepStep?: EffectDef[] | undefined;
	onGainIncomeStep?: EffectDef[] | undefined;
	onGainAPStep?: EffectDef[] | undefined;
}

export interface DevelopmentDef extends DevelopmentConfig, Triggered {
	order?: number;
	focus?: Focus;
}
export interface BuildingDef extends BuildingConfig, Triggered {
	focus?: Focus;
}

export type TriggerKey = keyof Triggered;
