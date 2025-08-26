import { describe, it, expect } from 'vitest';
import { createEngine, performAction, createActionRegistry } from '../../src/index.ts';

describe('land:till effect', () => {
  it('increases land slots up to the maximum', () => {
    const actions = createActionRegistry();
    actions.add('till', {
      id: 'till',
      name: 'Till',
      baseCosts: { ap: 0 },
      effects: [ { type: 'land', method: 'till', params: { landId: 'A-L2' } } ],
    });
    const ctx = createEngine({ actions });
    const land = ctx.activePlayer.lands[1]; // A-L2
    const before = land.slotsMax;
    const expected = Math.min(before + 1, ctx.services.rules.maxSlotsPerLand);
    performAction('till', ctx);
    expect(land.slotsMax).toBe(expected);
  });

  it('does not exceed maxSlotsPerLand', () => {
    const actions = createActionRegistry();
    actions.add('till', {
      id: 'till',
      name: 'Till',
      baseCosts: { ap: 0 },
      effects: [ { type: 'land', method: 'till', params: { landId: 'A-L2' } } ],
    });
    const ctx = createEngine({ actions });
    const land = ctx.activePlayer.lands[1];
    const max = ctx.services.rules.maxSlotsPerLand;
    const attempts = max - land.slotsMax + 1;
    for (let i = 0; i < attempts; i++) {
      performAction('till', ctx);
    }
    expect(land.slotsMax).toBe(max);
  });
});
