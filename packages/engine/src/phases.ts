import type { EffectDef } from './effects';

export type TriggerKey =
  | 'onDevelopmentPhase'
  | 'onUpkeepPhase'
  | 'onAttackResolved';

export interface StepDef {
  id: string;
  title?: string;
  triggers?: TriggerKey[];
  effects?: EffectDef[];
  icon?: string;
}

export interface PhaseDef {
  id: string;
  steps: StepDef[];
  action?: boolean;
  label: string;
  icon: string;
}
