import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  createActionRegistry,
} from '../../src/index.ts';

describe('land:till effect', () => {
  it('tills the specified land and marks it as tilled', () => {
    const actions = createActionRegistry();
    actions.add('till', {
      id: 'till',
      name: 'Till',
      system: true,
      effects: [{ type: 'land', method: 'till', params: { landId: 'A-L2' } }],
    });
    const ctx = createEngine({ actions });
    const land = ctx.activePlayer.lands[1];
    const before = land.slotsMax;
    const expected = Math.min(before + 1, ctx.services.rules.maxSlotsPerLand);
    performAction('till', ctx);
    expect(land.slotsMax).toBe(expected);
    expect(land.tilled).toBe(true);
  });

  it('throws if the land is already tilled', () => {
    const actions = createActionRegistry();
    actions.add('till', {
      id: 'till',
      name: 'Till',
      system: true,
      effects: [{ type: 'land', method: 'till', params: { landId: 'A-L2' } }],
    });
    const ctx = createEngine({ actions });
    performAction('till', ctx);
    expect(() => performAction('till', ctx)).toThrow(/already tilled/);
  });

  it('tills the first available land when no id is given', () => {
    const actions = createActionRegistry();
    actions.add('till', {
      id: 'till',
      name: 'Till',
      system: true,
      effects: [{ type: 'land', method: 'till' }],
    });
    const ctx = createEngine({ actions });
    performAction('till', ctx);
    const tilledCount = ctx.activePlayer.lands.filter((l) => l.tilled).length;
    expect(tilledCount).toBe(1);
  });
});
