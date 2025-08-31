import { Registry } from '@kingdom-builder/engine/registry';
import { Resource, Stat, PopulationRole } from '@kingdom-builder/engine/state';
import {
  actionSchema,
  type ActionConfig,
} from '@kingdom-builder/engine/config/schema';
import {
  action,
  effect,
  Types,
  LandMethods,
  ResourceMethods,
  DevelopmentMethods,
  PopulationMethods,
  ActionMethods,
  PassiveMethods,
  CostModMethods,
  BuildingMethods,
} from '@kingdom-builder/engine/config/builders';

export type ActionDef = ActionConfig;

export function createActionRegistry() {
  const registry = new Registry<ActionDef>(actionSchema);

  registry.add(
    'expand',
    action()
      .id('expand')
      .name('Expand')
      .icon('🌱')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 2)
      .effect(effect(Types.Land, LandMethods.ADD).param('count', 1).build())
      .effect(
        effect(Types.Resource, ResourceMethods.ADD)
          .params({ key: Resource.happiness, amount: 1 })
          .build(),
      )
      .build(),
  );

  registry.add(
    'overwork',
    action()
      .id('overwork')
      .name('Overwork')
      .icon('🛠️')
      .cost(Resource.ap, 1)
      .effect(
        effect()
          .evaluator('development', { id: 'farm' })
          .effect(
            effect(Types.Resource, ResourceMethods.ADD)
              .round('down')
              .params({ key: Resource.gold, amount: 2 })
              .build(),
          )
          .effect(
            effect(Types.Resource, ResourceMethods.ADD)
              .round('up')
              .params({ key: Resource.happiness, amount: -0.5 })
              .build(),
          )
          .build(),
      )
      .build(),
  );

  registry.add(
    'develop',
    action()
      .id('develop')
      .name('Develop')
      .icon('🏗️')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 3)
      .effect(
        effect(Types.Development, DevelopmentMethods.ADD)
          .params({ id: '$id', landId: '$landId' })
          .build(),
      )
      .build(),
  );

  registry.add(
    'tax',
    action()
      .id('tax')
      .name('Tax')
      .icon('💰')
      .cost(Resource.ap, 1)
      .effect(
        effect()
          .evaluator('population')
          .effect(
            effect(Types.Resource, ResourceMethods.ADD)
              .params({ key: Resource.gold, amount: 4 })
              .build(),
          )
          .effect(
            effect(Types.Resource, ResourceMethods.ADD)
              .round('up')
              .params({ key: Resource.happiness, amount: -0.5 })
              .build(),
          )
          .build(),
      )
      .build(),
  );

  registry.add(
    'reallocate',
    action()
      .id('reallocate')
      .name('Reallocate')
      .icon('🔄')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 5)
      .build(),
  );

  registry.add(
    'raise_pop',
    action()
      .id('raise_pop')
      .name('Raise Population')
      .icon('👶')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 5)
      .requirement({
        type: 'evaluator',
        method: 'compare',
        params: {
          left: { type: 'population' },
          operator: 'lt',
          right: { type: 'stat', params: { key: Stat.maxPopulation } },
        },
        message: 'Free space for 👥',
      })
      .effect(
        effect(Types.Population, PopulationMethods.ADD)
          .param('role', '$role')
          .build(),
      )
      .effect(
        effect(Types.Resource, ResourceMethods.ADD)
          .params({ key: Resource.happiness, amount: 1 })
          .build(),
      )
      .build(),
  );

  registry.add(
    'royal_decree',
    action()
      .id('royal_decree')
      .name('Royal Decree')
      .icon('📜')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 12)
      .build(),
  );

  registry.add(
    'army_attack',
    action()
      .id('army_attack')
      .name('Army Attack')
      .icon('🗡️')
      .cost(Resource.ap, 1)
      .requirement({
        type: 'evaluator',
        method: 'compare',
        params: {
          left: { type: 'stat', params: { key: Stat.warWeariness } },
          operator: 'lt',
          right: {
            type: 'population',
            params: { role: PopulationRole.Commander },
          },
        },
        message: 'War weariness must be lower than commanders',
      })
      .build(),
  );

  registry.add(
    'hold_festival',
    action()
      .id('hold_festival')
      .name('Hold Festival')
      .icon('🎉')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 3)
      .build(),
  );

  registry.add(
    'plow',
    action()
      .id('plow')
      .name('Plow')
      .icon('🚜')
      .system()
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 6)
      .effect(
        effect(Types.Action, ActionMethods.PERFORM)
          .param('id', 'expand')
          .build(),
      )
      .effect(
        effect(Types.Action, ActionMethods.PERFORM).param('id', 'till').build(),
      )
      .effect(
        effect(Types.Passive, PassiveMethods.ADD)
          .params({
            id: 'plow_cost_mod',
            onUpkeepPhase: [
              effect(Types.Passive, PassiveMethods.REMOVE)
                .param('id', 'plow_cost_mod')
                .build(),
            ],
          })
          .effect(
            effect(Types.CostMod, CostModMethods.ADD)
              .params({
                id: 'plow_cost_all',
                key: Resource.gold,
                amount: 2,
              })
              .build(),
          )
          .build(),
      )
      .build(),
  );

  registry.add(
    'till',
    action()
      .id('till')
      .name('Till')
      .icon('🧑‍🌾')
      .system()
      .effect(effect(Types.Land, LandMethods.TILL).build())
      .build(),
  );

  registry.add(
    'build',
    action()
      .id('build')
      .name('Build')
      .icon('🏛️')
      .cost(Resource.ap, 1)
      .effect(
        effect(Types.Building, BuildingMethods.ADD).param('id', '$id').build(),
      )
      .build(),
  );

  return registry;
}

export const ACTIONS = createActionRegistry();
