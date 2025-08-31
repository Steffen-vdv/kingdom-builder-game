import type { TriggerKey } from './defs';
import { Resource } from './resources';
import { Stat } from './stats';
import { PopulationRole } from '@kingdom-builder/engine/state';
import type { EffectDef } from '@kingdom-builder/engine/effects';
import { effect, Types, ResourceMethods, StatMethods } from './config/builders';

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
  icon?: string;
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
          effect()
            .evaluator('development', { id: 'farm' })
            .effect(
              effect(Types.Resource, ResourceMethods.ADD)
                .params({ key: Resource.gold, amount: 2 })
                .build(),
            )
            .build(),
        ],
      },
      {
        id: 'gain-ap',
        title: 'Gain Action Points',
        effects: [
          effect()
            .evaluator('population', { role: PopulationRole.Council })
            .effect(
              effect(Types.Resource, ResourceMethods.ADD)
                .params({ key: Resource.ap, amount: 1 })
                .build(),
            )
            .build(),
        ],
      },
      {
        id: 'raise-strength',
        title: 'Raise Strength',
        effects: [
          effect()
            .evaluator('population', { role: PopulationRole.Commander })
            .effect(
              effect(Types.Stat, StatMethods.ADD_PCT)
                .params({ key: Stat.armyStrength, percentStat: Stat.growth })
                .round('up')
                .build(),
            )
            .build(),
          effect()
            .evaluator('population', { role: PopulationRole.Fortifier })
            .effect(
              effect(Types.Stat, StatMethods.ADD_PCT)
                .params({
                  key: Stat.fortificationStrength,
                  percentStat: Stat.growth,
                })
                .round('up')
                .build(),
            )
            .build(),
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
          effect()
            .evaluator('population', { role: PopulationRole.Council })
            .effect(
              effect(Types.Resource, ResourceMethods.REMOVE)
                .params({ key: Resource.gold, amount: 2 })
                .build(),
            )
            .build(),
          effect()
            .evaluator('population', { role: PopulationRole.Commander })
            .effect(
              effect(Types.Resource, ResourceMethods.REMOVE)
                .params({ key: Resource.gold, amount: 1 })
                .build(),
            )
            .build(),
          effect()
            .evaluator('population', { role: PopulationRole.Fortifier })
            .effect(
              effect(Types.Resource, ResourceMethods.REMOVE)
                .params({ key: Resource.gold, amount: 1 })
                .build(),
            )
            .build(),
        ],
      },
      {
        id: 'war-recovery',
        title: 'War recovery',
        effects: [
          effect()
            .evaluator('compare', {
              left: { type: 'stat', params: { key: Stat.warWeariness } },
              operator: 'gt',
              right: 0,
            })
            .effect(
              effect(Types.Stat, StatMethods.REMOVE)
                .params({ key: Stat.warWeariness, amount: 1 })
                .build(),
            )
            .build(),
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
