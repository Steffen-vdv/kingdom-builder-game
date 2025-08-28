import { Registry } from '../registry';
import { PopulationRole, Resource, Stat } from '../state';
import { populationSchema } from '../config/schema';
import { population } from '../config/builders';
import type { PopulationDef } from './defs';

export type { PopulationDef } from './defs';

export function createPopulationRegistry() {
  const registry = new Registry<PopulationDef>(populationSchema);

  registry.add(
    PopulationRole.Council,
    population(PopulationRole.Council, 'Council')
      .onDevelopmentPhase({
        type: 'resource',
        method: 'add',
        params: { key: Resource.ap, amount: 1 },
      })
      .onUpkeepPhase({
        type: 'resource',
        method: 'remove',
        params: { key: Resource.gold, amount: 2 },
      })
      .build(),
  );

  registry.add(
    PopulationRole.Commander,
    population(PopulationRole.Commander, 'Army Commander')
      .onDevelopmentPhase({
        type: 'stat',
        method: 'add_pct',
        params: { key: Stat.armyStrength, percent: 25 },
      })
      .onUpkeepPhase({
        type: 'resource',
        method: 'remove',
        params: { key: Resource.gold, amount: 1 },
      })
      .build(),
  );

  registry.add(
    PopulationRole.Fortifier,
    population(PopulationRole.Fortifier, 'Fortifier')
      .onDevelopmentPhase({
        type: 'stat',
        method: 'add_pct',
        params: { key: Stat.fortificationStrength, percent: 25 },
      })
      .onUpkeepPhase({
        type: 'resource',
        method: 'remove',
        params: { key: Resource.gold, amount: 1 },
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
