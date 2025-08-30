import type { TriggerKey } from './defs';
import { Resource } from '../state';
import type { EffectDef } from '../effects';

export interface StepDef {
  id: string;
  title?: string;
  triggers?: TriggerKey[];
  effects?: EffectDef[];
}

export interface PhaseDef {
  id: string;
  steps: StepDef[];
  action?: boolean;
}

export const PHASES: PhaseDef[] = [
  {
    id: 'development',
    steps: [
      {
        id: 'gain-income',
        title: 'Gain Income',
        effects: [
          {
            evaluator: { type: 'development', params: { id: 'farm' } },
            effects: [
              {
                type: 'resource',
                method: 'add',
                params: { key: Resource.gold, amount: 2 },
              },
            ],
          },
        ],
        triggers: ['onDevelopmentPhase'],
      },
    ],
  },
  {
    id: 'upkeep',
    steps: [
      {
        id: 'pay-upkeep',
        title: 'Pay Upkeep',
        triggers: ['onUpkeepPhase'],
      },
    ],
  },
  {
    id: 'main',
    action: true,
    steps: [{ id: 'main', title: 'Main Phase' }],
  },
];
