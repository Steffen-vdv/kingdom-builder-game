import { Registry } from '../registry';
import { Resource, Stat } from '../state';
import { developmentSchema } from '../config/schema';
import { development } from '../config/builders';
import type { DevelopmentDef } from './defs';

export type { DevelopmentDef } from './defs';

export function createDevelopmentRegistry() {
  const reg = new Registry<DevelopmentDef>(developmentSchema);

  reg.add(
    'farm',
    development('farm', 'Farm')
      .onDevelopmentPhase({
        type: 'resource',
        method: 'add',
        params: { key: Resource.gold, amount: 2 },
      })
      .build(),
  );

  reg.add(
    'house',
    development('house', 'House')
      .onBuild({
        type: 'stat',
        method: 'add',
        params: { key: Stat.maxPopulation, amount: 1 },
      })
      .build(),
  );

  reg.add(
    'outpost',
    development('outpost', 'Outpost')
      .onBuild({
        type: 'stat',
        method: 'add',
        params: { key: Stat.armyStrength, amount: 1 },
      })
      .onBuild({
        type: 'stat',
        method: 'add',
        params: { key: Stat.fortificationStrength, amount: 1 },
      })
      .build(),
  );

  reg.add(
    'watchtower',
    development('watchtower', 'Watchtower')
      .onBuild({
        type: 'stat',
        method: 'add',
        params: { key: Stat.fortificationStrength, amount: 2 },
      })
      .onBuild({
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
      })
      .onAttackResolved({
        type: 'development',
        method: 'remove',
        params: { id: 'watchtower', landId: '$landId' },
      })
      .onAttackResolved({
        type: 'passive',
        method: 'remove',
        params: { id: 'watchtower_absorption_$landId' },
      })
      .build(),
  );

  return reg;
}

export const DEVELOPMENTS = createDevelopmentRegistry();
