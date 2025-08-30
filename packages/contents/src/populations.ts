import { Registry } from '@kingdom-builder/engine/registry';
import { PopulationRole, Resource, Stat } from '@kingdom-builder/engine/state';
import { populationSchema } from '@kingdom-builder/engine/config/schema';
import { population } from '@kingdom-builder/engine/config/builders';
import type { PopulationDef } from './defs';

export type { PopulationDef } from './defs';

export function createPopulationRegistry() {
  const registry = new Registry<PopulationDef>(populationSchema);

  registry.add(
    PopulationRole.Council,
    population(PopulationRole.Council, 'Council')
      .onAssigned({
        type: 'resource',
        method: 'add',
        params: { key: Resource.ap, amount: 1 },
      })
      .onUnassigned({
        type: 'resource',
        method: 'remove',
        params: { key: Resource.ap, amount: 1 },
      })
      .build(),
  );

  registry.add(
    PopulationRole.Commander,
    population(PopulationRole.Commander, 'Army Commander')
      .onAssigned({
        type: 'passive',
        method: 'add',
        params: { id: 'commander_$player_$index' },
        effects: [
          {
            type: 'stat',
            method: 'add',
            params: { key: Stat.armyStrength, amount: 1 },
          },
        ],
      })
      .onUnassigned({
        type: 'passive',
        method: 'remove',
        params: { id: 'commander_$player_$index' },
      })
      .build(),
  );

  registry.add(
    PopulationRole.Fortifier,
    population(PopulationRole.Fortifier, 'Fortifier')
      .onAssigned({
        type: 'passive',
        method: 'add',
        params: { id: 'fortifier_$player_$index' },
        effects: [
          {
            type: 'stat',
            method: 'add',
            params: { key: Stat.fortificationStrength, amount: 1 },
          },
        ],
      })
      .onUnassigned({
        type: 'passive',
        method: 'remove',
        params: { id: 'fortifier_$player_$index' },
      })
      .build(),
  );

  registry.add(
    PopulationRole.Citizen,
    population(PopulationRole.Citizen, 'Citizen').build(),
  );

  return registry;
}

export const POPULATIONS = createPopulationRegistry();
