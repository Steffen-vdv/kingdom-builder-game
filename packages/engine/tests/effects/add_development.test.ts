import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  createActionRegistry,
  Stat,
} from '../../src/index.ts';

// Custom actions used to exercise the development:add handler
const actions = createActionRegistry();
// success case: build on empty land
actions.add('build_house', {
  id: 'build_house',
  name: 'Build House',
  baseCosts: { ap: 0 },
  effects: [
    {
      type: 'development',
      method: 'add',
      params: { id: 'house', landId: 'A-L2' },
    },
  ],
});
// error case: land does not exist
actions.add('build_house_bad_land', {
  id: 'build_house_bad_land',
  name: 'Build House Bad Land',
  baseCosts: { ap: 0 },
  effects: [
    {
      type: 'development',
      method: 'add',
      params: { id: 'house', landId: 'A-L9' },
    },
  ],
});
// error case: target land already full
actions.add('build_house_full', {
  id: 'build_house_full',
  name: 'Build House Full',
  baseCosts: { ap: 0 },
  effects: [
    {
      type: 'development',
      method: 'add',
      params: { id: 'house', landId: 'A-L1' },
    },
  ],
});

function getHouseMaxPopGain(ctx: ReturnType<typeof createEngine>) {
  const def = ctx.developments.get('house');
  const eff = def?.onBuild?.find(
    (e) =>
      e.type === 'stat' &&
      e.method === 'add' &&
      e.params?.key === Stat.maxPopulation,
  );
  return eff?.params?.amount ?? 0;
}

describe('development:add effect', () => {
  it('adds house and applies onBuild effects', () => {
    const ctx = createEngine({ actions });
    const land = ctx.activePlayer.lands[1]; // A-L2
    const maxBefore = ctx.activePlayer.maxPopulation;
    const slotsBefore = land.slotsUsed;
    performAction('build_house', ctx);
    const gain = getHouseMaxPopGain(ctx);
    expect(land.developments).toContain('house');
    expect(land.slotsUsed).toBe(slotsBefore + 1);
    expect(ctx.activePlayer.maxPopulation).toBe(maxBefore + gain);
  });

  it('throws if land does not exist', () => {
    const ctx = createEngine({ actions });
    expect(() => performAction('build_house_bad_land', ctx)).toThrow(
      /Land A-L9 not found/,
    );
  });

  it('throws if land has no free slots', () => {
    const ctx = createEngine({ actions });
    expect(() => performAction('build_house_full', ctx)).toThrow(
      /No free slots on land A-L1/,
    );
  });
});
