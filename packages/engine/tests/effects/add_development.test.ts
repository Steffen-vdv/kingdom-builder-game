import { describe, it, expect } from 'vitest';
import { createEngine, performAction, createActionRegistry } from '../../src/index.ts';

// Custom action to build a house on an empty land slot
const actions = createActionRegistry();
actions.add('build_house', {
  id: 'build_house',
  name: 'Build House',
  baseCosts: { ap: 0 },
  effects: [
    { type: 'add_development', params: { id: 'house', landId: 'A-L2' } },
  ],
});

describe('add_development effect', () => {
  it('adds house and applies onBuild effects', () => {
    const ctx = createEngine({ actions });
    const land = ctx.activePlayer.lands[1]; // A-L2
    const maxBefore = ctx.activePlayer.maxPopulation;
    performAction('build_house', ctx);
    expect(land.developments).toContain('house');
    expect(land.slotsUsed).toBe(1);
    expect(ctx.activePlayer.maxPopulation).toBe(maxBefore + 1);
  });
});
