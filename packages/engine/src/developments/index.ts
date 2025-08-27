import { Registry } from '../registry';
import { Resource, Stat } from '../state';
import { developmentSchema, type DevelopmentConfig } from '../config/schema';

export type DevelopmentDef = DevelopmentConfig;

export function createDevelopmentRegistry() {
  const reg = new Registry<DevelopmentDef>(developmentSchema);

  reg.add('farm', {
    id: 'farm',
    name: 'Farm',
    onDevelopmentPhase: [
      {
        type: 'resource',
        method: 'add',
        params: { key: Resource.gold, amount: 2 },
      },
    ],
  });

  reg.add('house', {
    id: 'house',
    name: 'House',
    onBuild: [
      {
        type: 'stat',
        method: 'add',
        params: { key: Stat.maxPopulation, amount: 1 },
      },
    ],
  });

  reg.add('outpost', {
    id: 'outpost',
    name: 'Outpost',
    onBuild: [
      {
        type: 'stat',
        method: 'add',
        params: { key: Stat.armyStrength, amount: 1 },
      },
      {
        type: 'stat',
        method: 'add',
        params: { key: Stat.fortificationStrength, amount: 1 },
      },
    ],
  });

  reg.add('watchtower', {
    id: 'watchtower',
    name: 'Watchtower',
    onBuild: [
      {
        type: 'stat',
        method: 'add',
        params: { key: Stat.fortificationStrength, amount: 2 },
      },
      {
        type: 'passive',
        method: 'add',
        params: { id: 'watchtower_absorption_$landId' },
        effects: [
          {
            type: 'stat',
            method: 'add',
            params: { key: Stat.absorption, amount: 0.5 },
          },
        ],
      },
    ],
    onAttackResolved: [
      {
        type: 'development',
        method: 'remove',
        params: { id: 'watchtower', landId: '$landId' },
      },
      {
        type: 'passive',
        method: 'remove',
        params: { id: 'watchtower_absorption_$landId' },
      },
    ],
  });

  return reg;
}

export const DEVELOPMENTS = createDevelopmentRegistry();
