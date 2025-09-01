import type {
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
} from '@kingdom-builder/engine/config/schema';
import type { EffectDef } from '@kingdom-builder/engine/effects';

export interface Triggered {
  onGrowthPhase?: EffectDef[] | undefined;
  onUpkeepPhase?: EffectDef[] | undefined;
  onBeforeAttacked?: EffectDef[] | undefined;
  onAttackResolved?: EffectDef[] | undefined;
}

export interface PopulationDef extends PopulationConfig, Triggered {}
export interface DevelopmentDef extends DevelopmentConfig, Triggered {
  order?: number;
}
export interface BuildingDef extends BuildingConfig, Triggered {}

export type TriggerKey = keyof Triggered;
