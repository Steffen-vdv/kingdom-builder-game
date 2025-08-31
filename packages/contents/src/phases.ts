import { Resource } from './resources';
import { Stat } from './stats';
import { PopulationRole } from './populationRoles';
import {
  effect,
  Types,
  ResourceMethods,
  StatMethods,
  phase,
  step,
  type PhaseDef,
} from './config/builders';
export type { StepDef, PhaseDef } from './config/builders';

export const PHASES: PhaseDef[] = [
  phase()
    .id('development')
    .label('Development')
    .icon('🏗️')
    .step(
      step()
        .id('resolve-dynamic-triggers')
        .title('Resolve dynamic triggers')
        .trigger('onDevelopmentPhase')
        .build(),
    )
    .step(
      step()
        .id('gain-income')
        .title('Gain Income')
        .icon('💰')
        .effect(
          effect()
            .evaluator('development', { id: 'farm' })
            .effect(
              effect(Types.Resource, ResourceMethods.ADD)
                .params({ key: Resource.gold, amount: 2 })
                .build(),
            )
            .build(),
        )
        .build(),
    )
    .step(
      step()
        .id('gain-ap')
        .title('Gain Action Points')
        .effect(
          effect()
            .evaluator('population', { role: PopulationRole.Council })
            .effect(
              effect(Types.Resource, ResourceMethods.ADD)
                .params({ key: Resource.ap, amount: 1 })
                .build(),
            )
            .build(),
        )
        .build(),
    )
    .step(
      step()
        .id('raise-strength')
        .title('Raise Strength')
        .effect(
          effect()
            .evaluator('population', { role: PopulationRole.Commander })
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
        )
        .build(),
    )
    .build(),
  phase()
    .id('upkeep')
    .label('Upkeep')
    .icon('🧹')
    .step(
      step()
        .id('resolve-dynamic-triggers')
        .title('Resolve dynamic triggers')
        .trigger('onUpkeepPhase')
        .build(),
    )
    .step(
      step()
        .id('pay-upkeep')
        .title('Pay Upkeep')
        .effect(
          effect()
            .evaluator('population', { role: PopulationRole.Council })
            .effect(
              effect(Types.Resource, ResourceMethods.REMOVE)
                .params({ key: Resource.gold, amount: 2 })
                .build(),
            )
            .build(),
        )
        .effect(
          effect()
            .evaluator('population', { role: PopulationRole.Commander })
            .effect(
              effect(Types.Resource, ResourceMethods.REMOVE)
                .params({ key: Resource.gold, amount: 1 })
                .build(),
            )
            .build(),
        )
        .effect(
          effect()
            .evaluator('population', { role: PopulationRole.Fortifier })
            .effect(
              effect(Types.Resource, ResourceMethods.REMOVE)
                .params({ key: Resource.gold, amount: 1 })
                .build(),
            )
            .build(),
        )
        .build(),
    )
    .step(
      step()
        .id('war-recovery')
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
        )
        .build(),
    )
    .build(),
  phase()
    .id('main')
    .label('Main')
    .icon('🎯')
    .action()
    .step(step().id('main').title('Main Phase').build())
    .build(),
];
