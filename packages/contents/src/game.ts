import { Resource } from './resources';
import { Stat } from './stats';
import { PopulationRole } from './populationRoles';
import { start } from './config/builders';

export const GAME_START = start()
  .player((p) =>
    p
      .resource(Resource.gold, 10)
      .resource(Resource.ap, 0)
      .resource(Resource.happiness, 0)
      .resource(Resource.castleHP, 10)
      .stat(Stat.maxPopulation, 1)
      .stat(Stat.armyStrength, 0)
      .stat(Stat.fortificationStrength, 0)
      .stat(Stat.absorption, 0)
      .stat(Stat.growth, 0.25)
      .stat(Stat.warWeariness, 0)
      .population(PopulationRole.Council, 1)
      .population(PopulationRole.Commander, 0)
      .population(PopulationRole.Fortifier, 0)
      .population(PopulationRole.Citizen, 0)
      .land(['farm'])
      .land(),
  )
  .bonus('B', (p) => p.resource(Resource.ap, 1))
  .build();
