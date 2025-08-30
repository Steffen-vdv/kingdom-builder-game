import type {
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
} from '@kingdom-builder/engine/config/schema';
import type { EffectDef } from '@kingdom-builder/engine/effects';

export interface Triggered {
  onDevelopmentPhase?: EffectDef[] | undefined;
  onUpkeepPhase?: EffectDef[] | undefined;
  onAttackResolved?: EffectDef[] | undefined;
}

export interface PopulationDef extends PopulationConfig, Triggered {}
export interface DevelopmentDef extends DevelopmentConfig, Triggered {}
export interface BuildingDef extends BuildingConfig, Triggered {}

export type TriggerKey = keyof Triggered;
