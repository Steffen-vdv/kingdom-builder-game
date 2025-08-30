import type { TriggerKey } from './defs';

export interface StepDef {
  id: string;
  trigger?: TriggerKey;
}

export interface PhaseDef {
  id: string;
  steps: StepDef[];
}

export const PHASES: PhaseDef[] = [
  {
    id: 'development',
    steps: [{ id: 'default', trigger: 'onDevelopmentPhase' }],
  },
  {
    id: 'upkeep',
    steps: [{ id: 'default', trigger: 'onUpkeepPhase' }],
  },
  {
    id: 'main',
    steps: [{ id: 'default' }],
  },
];
