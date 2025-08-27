import { Registry } from '../registry';
import { Resource, Stat } from '../state';
import type { EffectDef } from '../effects';

export type DevelopmentDef = {
  id: string;
  name: string;
  onBuild?: EffectDef[];
  onDevelopmentPhase?: EffectDef[];
};

export function createDevelopmentRegistry() {
  const reg = new Registry<DevelopmentDef>();

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

  return reg;
}

export const DEVELOPMENTS = createDevelopmentRegistry();
