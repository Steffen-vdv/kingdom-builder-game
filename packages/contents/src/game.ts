import { Resource, Stat, PopulationRole } from '@kingdom-builder/engine/state';
import type { StartConfig } from '@kingdom-builder/engine/config/schema';

export const GAME_START: StartConfig = {
  player: {
    resources: {
      [Resource.gold]: 10,
      [Resource.ap]: 0,
      [Resource.happiness]: 0,
      [Resource.castleHP]: 10,
    },
    stats: {
      [Stat.maxPopulation]: 1,
      [Stat.armyStrength]: 0,
      [Stat.fortificationStrength]: 0,
      [Stat.absorption]: 0,
      [Stat.growth]: 0.25,
      [Stat.warWeariness]: 0,
    },
    population: {
      [PopulationRole.Council]: 1,
      [PopulationRole.Commander]: 0,
      [PopulationRole.Fortifier]: 0,
      [PopulationRole.Citizen]: 0,
    },
    lands: [{ developments: ['farm'] }, {}],
  },
  players: {
    B: {
      resources: { [Resource.ap]: 1 },
    },
  },
};
