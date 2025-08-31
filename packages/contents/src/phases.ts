import type { TriggerKey } from './defs';
import { Resource, PopulationRole, Stat } from '@kingdom-builder/engine/state';
import type { EffectDef } from '@kingdom-builder/engine/effects';

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

export const PHASES: PhaseDef[] = [
  {
    id: 'development',
    label: 'Development',
    icon: '🏗️',
    steps: [
      {
        id: 'resolve-dynamic-triggers',
        title: 'Resolve dynamic triggers',
        triggers: ['onDevelopmentPhase'],
      },
      {
        id: 'gain-income',
        title: 'Gain Income',
        icon: '💰',
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
                round: 'up',
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
                round: 'up',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'upkeep',
    label: 'Upkeep',
    icon: '🧹',
    steps: [
      {
        id: 'resolve-dynamic-triggers',
        title: 'Resolve dynamic triggers',
        triggers: ['onUpkeepPhase'],
      },
      {
        id: 'pay-upkeep',
        title: 'Pay Upkeep',
        effects: [
          {
            evaluator: {
              type: 'population',
              params: { role: PopulationRole.Council },
            },
            effects: [
              {
                type: 'resource',
                method: 'remove',
                params: { key: Resource.gold, amount: 2 },
              },
            ],
          },
          {
            evaluator: {
              type: 'population',
              params: { role: PopulationRole.Commander },
            },
            effects: [
              {
                type: 'resource',
                method: 'remove',
                params: { key: Resource.gold, amount: 1 },
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
                type: 'resource',
                method: 'remove',
                params: { key: Resource.gold, amount: 1 },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'main',
    label: 'Main',
    icon: '🎯',
    action: true,
    steps: [{ id: 'main', title: 'Main Phase' }],
  },
];

export const PHASE_INFO: Record<string, { icon: string; label: string }> =
  Object.fromEntries(
    PHASES.map((p) => [p.id, { icon: p.icon, label: p.label }]),
  );
