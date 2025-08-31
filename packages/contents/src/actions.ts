import { Registry } from '@kingdom-builder/engine/registry';
import { Resource, Stat, PopulationRole } from '@kingdom-builder/engine/state';
import { STATS } from './stats';
import { POPULATION_ROLES } from './populationRoles';
import {
  actionSchema,
  type ActionConfig,
} from '@kingdom-builder/engine/config/schema';
import {
  action,
  effect,
  requirement,
  Types,
  LandMethods,
  ResourceMethods,
  DevelopmentMethods,
  PopulationMethods,
  ActionMethods,
  PassiveMethods,
  CostModMethods,
  BuildingMethods,
  StatMethods,
} from './config/builders';

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
          .evaluator('population', { id: 'tax' })
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
      .requirement(
        requirement('evaluator', 'compare')
          .param('left', { type: 'population' })
          .param('operator', 'lt')
          .param('right', { type: 'stat', params: { key: Stat.maxPopulation } })
          .message('Free space for 👥')
          .build(),
      )
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
      .requirement(
        requirement('evaluator', 'compare')
          .param('left', { type: 'stat', params: { key: Stat.warWeariness } })
          .param('operator', 'lt')
          .param('right', {
            type: 'population',
            params: { role: PopulationRole.Commander },
          })
          .message(
            `${STATS[Stat.warWeariness].icon} ${STATS[Stat.warWeariness].label} must be lower than ${POPULATION_ROLES[PopulationRole.Commander].icon} ${POPULATION_ROLES[PopulationRole.Commander].label}`,
          )
          .build(),
      )
      .effect(
        effect('attack', 'perform')
          .param('onCastleDamage', {
            attacker: [
              effect(Types.Resource, ResourceMethods.ADD)
                .params({ key: Resource.happiness, amount: 1 })
                .build(),
              effect(Types.Action, ActionMethods.PERFORM)
                .param('id', 'plunder')
                .build(),
            ],
            defender: [
              effect(Types.Resource, ResourceMethods.ADD)
                .params({ key: Resource.happiness, amount: -1 })
                .build(),
            ],
          })
          .build(),
      )
      .effect(
        effect(Types.Stat, StatMethods.ADD)
          .params({ key: Stat.warWeariness, amount: 1 })
          .build(),
      )
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
    'plunder',
    action()
      .id('plunder')
      .name('Plunder')
      .icon('🏴\u200d☠️')
      .system()
      // Base 25% transfer; modifiers may adjust via result_mod targeting
      // evaluation { type: 'transfer_pct', id: 'percent' } with an `adjust` value.
      .effect(
        effect(Types.Resource, ResourceMethods.TRANSFER)
          .params({ key: Resource.gold, percent: 25 })
          .build(),
      )
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
