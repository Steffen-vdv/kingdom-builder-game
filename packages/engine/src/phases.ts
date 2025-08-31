import type { EffectDef } from './effects';

export interface StepDef {
  id: string;
  title?: string;
  effects?: EffectDef[];
  triggers?: string[];
}

export interface PhaseDef {
  id: string;
  steps: StepDef[];
  action?: boolean;
  icon?: string;
  label?: string;
}
