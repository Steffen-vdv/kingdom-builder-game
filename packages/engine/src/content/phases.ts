import type { TriggerKey } from './defs';
import type { EffectDef } from '../effects';

export interface PhaseStep {
  /** unique identifier for the step within its phase */
  id: string;
  /** human readable title */
  title: string;
  /** trigger to resolve for this step */
  trigger?: TriggerKey | undefined;
  /** additional effects to resolve */
  effects?: EffectDef[] | undefined;
}

export interface PhaseDef {
  /** phase identifier */
  id: string;
  /** display name */
  name: string;
  /** ordered list of steps */
  steps: readonly PhaseStep[];
}

export const PHASES = [
  {
    id: 'development',
    name: 'Development',
    steps: [
      { id: 'income', title: 'Gain Income', trigger: 'onDevelopmentPhase' },
      {
        id: 'ap',
        title: 'Generate Action Points',
        trigger: 'onDevelopmentPhase',
      },
      {
        id: 'strength',
        title: 'Grow Strengths',
        trigger: 'onDevelopmentPhase',
      },
    ],
  },
  {
    id: 'upkeep',
    name: 'Upkeep',
    steps: [
      { id: 'pay', title: 'Pay Upkeep', trigger: 'onUpkeepPhase' },
      { id: 'shortfall', title: 'Check Shortfall', trigger: 'onUpkeepPhase' },
      { id: 'end', title: 'End-of-Upkeep triggers', trigger: 'onUpkeepPhase' },
    ],
  },
  {
    id: 'main',
    name: 'Main',
    steps: [{ id: 'actions', title: 'Main Phase' }],
  },
] as const;

export type PhaseId = (typeof PHASES)[number]['id'];
export type StepId = (typeof PHASES)[number]['steps'][number]['id'];
