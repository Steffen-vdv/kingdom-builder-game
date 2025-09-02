import { Stat } from './stats';
import { PopulationRole } from './populationRoles';
import {
  effect,
  Types,
  StatMethods,
  phase,
  step,
  type PhaseDef,
} from './config/builders';
import {
  ON_GAIN_AP_STEP,
  ON_GAIN_INCOME_STEP,
  ON_PAY_UPKEEP_STEP,
} from './defs';

export const PHASES: PhaseDef[] = [
  phase('growth')
    .label('Growth')
    .icon('🏗️')
    .step(
      step('resolve-dynamic-triggers')
        .title('Resolve dynamic triggers')
        .triggers('onGrowthPhase'),
    )
    .step(
      step('gain-income')
        .title('Gain Income')
        .icon('💰')
        .triggers(ON_GAIN_INCOME_STEP),
    )
    .step(step('gain-ap').title('Gain Action Points').triggers(ON_GAIN_AP_STEP))
    .step(
      step('raise-strength')
        .title('Raise Strength')
        .effect(
          effect()
            .evaluator('population', { role: PopulationRole.Legion })
            .effect(
              effect(Types.Stat, StatMethods.ADD_PCT)
                .params({ key: Stat.armyStrength, percentStat: Stat.growth })
                .round('up')
                .build(),
            )
            .build(),
        )
        .effect(
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
        ),
    )
    .build(),
  phase('upkeep')
    .label('Upkeep')
    .icon('🧹')
    .step(
      step('resolve-dynamic-triggers')
        .title('Resolve dynamic triggers')
        .triggers('onUpkeepPhase'),
    )
    .step(step('pay-upkeep').title('Pay Upkeep').triggers(ON_PAY_UPKEEP_STEP))
    .step(
      step('war-recovery')
        .title('War recovery')
        .effect(
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
        ),
    )
    .build(),
  phase('main')
    .label('Main')
    .icon('🎯')
    .action()
    .step(step('main').title('Main Phase'))
    .build(),
];
