import { Registry } from '@kingdom-builder/engine/registry';
import { PopulationRole } from './populationRoles';
import { Resource } from './resources';
import { Stat } from './stats';
import { populationSchema } from '@kingdom-builder/engine/config/schema';
import {
  population,
  effect,
  Types,
  ResourceMethods,
  PassiveMethods,
  StatMethods,
} from './config/builders';
import type { PopulationDef } from './defs';

export type { PopulationDef } from './defs';

export function createPopulationRegistry() {
  const registry = new Registry<PopulationDef>(populationSchema);

  registry.add(
    PopulationRole.Council,
    population()
      .id(PopulationRole.Council)
      .name('Council')
      .icon('⚖️')
      .onAssigned(
        effect(Types.Resource, ResourceMethods.ADD)
          .params({ key: Resource.ap, amount: 1 })
          .build(),
      )
      .onUnassigned(
        effect(Types.Resource, ResourceMethods.REMOVE)
          .params({ key: Resource.ap, amount: 1 })
          .build(),
      )
      .build(),
  );

  registry.add(
    PopulationRole.Commander,
    population()
      .id(PopulationRole.Commander)
      .name('Commander')
      .icon('🎖️')
      .onAssigned(
        effect(Types.Passive, PassiveMethods.ADD)
          .param('id', 'commander_$player_$index')
          .effect(
            effect(Types.Stat, StatMethods.ADD)
              .params({ key: Stat.armyStrength, amount: 1 })
              .build(),
          )
          .build(),
      )
      .onUnassigned(
        effect(Types.Passive, PassiveMethods.REMOVE)
          .param('id', 'commander_$player_$index')
          .build(),
      )
      .build(),
  );

  registry.add(
    PopulationRole.Fortifier,
    population()
      .id(PopulationRole.Fortifier)
      .name('Fortifier')
      .icon('🔧')
      .onAssigned(
        effect(Types.Passive, PassiveMethods.ADD)
          .param('id', 'fortifier_$player_$index')
          .effect(
            effect(Types.Stat, StatMethods.ADD)
              .params({ key: Stat.fortificationStrength, amount: 1 })
              .build(),
          )
          .build(),
      )
      .onUnassigned(
        effect(Types.Passive, PassiveMethods.REMOVE)
          .param('id', 'fortifier_$player_$index')
          .build(),
      )
      .build(),
  );

  registry.add(
    PopulationRole.Citizen,
    population().id(PopulationRole.Citizen).name('Citizen').icon('👤').build(),
  );

  return registry;
}

export const POPULATIONS = createPopulationRegistry();
