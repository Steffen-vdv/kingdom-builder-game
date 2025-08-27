import { Registry } from '../registry';
import { PopulationRole, Resource, Stat } from '../state';
import { populationSchema, type PopulationConfig } from '../config/schema';
import { population } from '../config/builders';

export type PopulationDef = PopulationConfig;

export function createPopulationRegistry() {
  const reg = new Registry<PopulationDef>(populationSchema);

  reg.add(
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

  reg.add(
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

  reg.add(
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

  reg.add(
    PopulationRole.Citizen,
    population(PopulationRole.Citizen, 'Citizen').build(),
  );

  return reg;
}

export const POPULATIONS = createPopulationRegistry();
