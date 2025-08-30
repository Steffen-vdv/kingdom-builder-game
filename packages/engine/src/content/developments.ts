import { Registry } from '../registry';
import { Stat } from '../state';
import { developmentSchema } from '../config/schema';
import { development } from '../config/builders';
import type { DevelopmentDef } from './defs';

export type { DevelopmentDef } from './defs';

export function createDevelopmentRegistry() {
  const registry = new Registry<DevelopmentDef>(developmentSchema);

  registry.add('farm', development('farm', 'Farm').build());

  registry.add(
    'house',
    development('house', 'House')
      .onBuild({
        type: 'stat',
        method: 'add',
        params: { key: Stat.maxPopulation, amount: 1 },
      })
      .build(),
  );

  registry.add(
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

  registry.add(
    'watchtower',
    development('watchtower', 'Watchtower')
      .onBuild({
        type: 'stat',
        method: 'add',
        params: { key: Stat.fortificationStrength, amount: 2 },
      })
      .onBuild({
        type: 'stat',
        method: 'add',
        params: { key: Stat.absorption, amount: 0.5 },
      })
      .onAttackResolved({
        type: 'development',
        method: 'remove',
        params: { id: 'watchtower', landId: '$landId' },
      })
      .build(),
  );

  registry.add('garden', development('garden', 'Garden').system().build());

  return registry;
}

export const DEVELOPMENTS = createDevelopmentRegistry();

export const DEVELOPMENT_INFO: Record<string, { icon: string; label: string }> =
  {
    house: { icon: '🏠', label: DEVELOPMENTS.get('house').name },
    farm: { icon: '🌾', label: DEVELOPMENTS.get('farm').name },
    outpost: { icon: '🛡️', label: DEVELOPMENTS.get('outpost').name },
    watchtower: { icon: '🗼', label: DEVELOPMENTS.get('watchtower').name },
    garden: { icon: '🌿', label: DEVELOPMENTS.get('garden').name },
  };
