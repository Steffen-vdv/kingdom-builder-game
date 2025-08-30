import type { EffectDef } from './effects';

export interface StepDef {
  id: string;
  title?: string;
  triggers?: string[];
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
