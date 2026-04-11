import type { BuildingConfig, DevelopmentConfig, EffectDef } from '@kingdom-builder/protocol';
import { Focus } from '../constants';
import type { FocusValue } from '../constants';

export const BROOM_ICON = '🧹';
export const GENERAL_RESOURCE_ICON = '🧺';
export const RESOURCE_TRANSFER_ICON = '🔁';

export { Focus };
export type { FocusValue };

export interface Triggered {
	onBeforeAttacked?: EffectDef[] | undefined;
	onAttackResolved?: EffectDef[] | undefined;
	onPayUpkeepStep?: EffectDef[] | undefined;
	onGainIncomeStep?: EffectDef[] | undefined;
	onGainAPStep?: EffectDef[] | undefined;
}

export interface DevelopmentDef extends DevelopmentConfig, Triggered {
	order?: number;
	focus?: FocusValue;
}
export interface BuildingDef extends BuildingConfig, Triggered {
	focus?: FocusValue;
}

export type TriggerKey = keyof Triggered;
