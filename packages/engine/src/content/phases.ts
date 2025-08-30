import type { TriggerKey } from './defs';
import { Resource, PopulationRole, Stat } from '../state';
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
      {
        id: 'gain-ap',
        title: 'Gain Action Points',
        effects: [
          {
            evaluator: {
              type: 'population',
              params: { role: PopulationRole.Council },
            },
            effects: [
              {
                type: 'resource',
                method: 'add',
                params: { key: Resource.ap, amount: 1 },
              },
            ],
          },
        ],
      },
      {
        id: 'raise-strength',
        title: 'Raise Strength',
        effects: [
          {
            evaluator: {
              type: 'population',
              params: { role: PopulationRole.Commander },
            },
            effects: [
              {
                type: 'stat',
                method: 'add_pct',
                params: { key: Stat.armyStrength, percent: 25 },
              },
            ],
          },
          {
            evaluator: {
              type: 'population',
              params: { role: PopulationRole.Fortifier },
            },
            effects: [
              {
                type: 'stat',
                method: 'add_pct',
                params: { key: Stat.fortificationStrength, percent: 25 },
              },
            ],
          },
        ],
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
