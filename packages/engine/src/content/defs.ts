import type {
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
} from '../config/schema';
import type { EffectDef } from '../effects';

export interface Triggered {
  onDevelopmentPhase: EffectDef[] | undefined;
  onUpkeepPhase: EffectDef[] | undefined;
  onAttackResolved: EffectDef[] | undefined;
}

export type PopulationDef = PopulationConfig & Partial<Triggered>;
export type DevelopmentDef = DevelopmentConfig & Partial<Triggered>;
export type BuildingDef = BuildingConfig & Partial<Triggered>;

export type TriggerKey = keyof Triggered;
