import { Registry } from '../registry';
import { Resource } from '../state';
import type { CostBag } from '../services';
import type { EffectDef } from '../effects';

export type ActionDef = {
  id: string;
  name: string;
  baseCosts?: CostBag;
  requirements?: ((ctx: import('../context').EngineContext) => true | string)[];
  effects: EffectDef[];
};

export function createActionRegistry() {
  const reg = new Registry<ActionDef>();

  reg.add('expand', {
    id: 'expand',
    name: 'Expand',
    baseCosts: { [Resource.gold]: 2 },
    effects: [
      { type: 'land', method: 'add', params: { count: 1 } },
      {
        type: 'resource',
        method: 'add',
        params: { key: Resource.happiness, amount: 1 },
      },
    ],
  });

  // A simple build action to acquire Town Charter in tests
  reg.add('build_town_charter', {
    id: 'build_town_charter',
    name: 'Build — Town Charter',
    baseCosts: { [Resource.gold]: 5 },
    effects: [
      { type: 'building', method: 'add', params: { id: 'town_charter' } },
    ],
  });

  reg.add('overwork', {
    id: 'overwork',
    name: 'Overwork',
    baseCosts: { [Resource.ap]: 0 }, // Free
    effects: [
      {
        evaluator: { type: 'development', params: { id: 'farm' } },
        effects: [
          {
            type: 'resource',
            method: 'add',
            round: 'down',
            params: { key: Resource.gold, amount: 2 },
          },
          {
            type: 'resource',
            method: 'add',
            round: 'up',
            params: { key: Resource.happiness, amount: -0.5 },
          },
        ],
      },
    ],
  });

  reg.add('develop', {
    id: 'develop',
    name: 'Develop',
    baseCosts: { [Resource.gold]: 3 },
    // TODO: place House, Farm, Outpost, or Watchtower on land with an open slot
    effects: [],
  });

  reg.add('tax', {
    id: 'tax',
    name: 'Tax',
    baseCosts: { [Resource.ap]: 0 }, // Free
    // TODO: +4 gold per population; -0.5 happiness per population (rounded up)
    effects: [],
  });

  reg.add('reallocate', {
    id: 'reallocate',
    name: 'Reallocate',
    baseCosts: { [Resource.gold]: 5 },
    // TODO: move 1 population between roles; -1 happiness; adjust AP when moving to/from Council
    effects: [],
  });

  reg.add('raise_pop', {
    id: 'raise_pop',
    name: 'Raise Population',
    baseCosts: { [Resource.gold]: 5 },
    // TODO: requires free House; +1 population (assign immediately); +1 happiness; +1 AP if assigned to Council
    effects: [],
  });

  reg.add('royal_decree', {
    id: 'royal_decree',
    name: 'Royal Decree',
    baseCosts: { [Resource.gold]: 12 },
    // TODO: Expand → Till → Develop (House/Farm/Outpost/Watchtower), then -3 happiness
    effects: [],
  });

  reg.add('army_attack', {
    id: 'army_attack',
    name: 'Army Attack',
    baseCosts: { [Resource.ap]: 0 }, // Free
    // TODO: limited by number of Commanders; damage uses Army Strength with Absorption rules
    effects: [],
  });

  reg.add('hold_festival', {
    id: 'hold_festival',
    name: 'Hold Festival',
    baseCosts: { [Resource.gold]: 3 },
    // TODO: +2 happiness; cannot attack this turn; attacks against you double damage before absorption
    effects: [],
  });

  reg.add('plow', {
    id: 'plow',
    name: 'Plow',
    baseCosts: { [Resource.gold]: 6 },
    // TODO: requires Plow Workshop; Expand; Till; next action costs +2 gold
    effects: [],
  });

  reg.add('build', {
    id: 'build',
    name: 'Build',
    // TODO: choose a building to construct; costs vary by building
    effects: [],
  });
  return reg;
}
