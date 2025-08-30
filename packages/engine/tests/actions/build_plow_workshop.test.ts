import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  getActionCosts,
  Resource,
  advance,
} from '../../src/index.ts';

describe('Build - Plow Workshop action', () => {
  it('builds the Plow Workshop and unlocks Plow', () => {
    const ctx = createEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const cost = getActionCosts('build_plow_workshop', ctx);
    const buildingCost =
      ctx.buildings.get('plow_workshop').costs[Resource.gold];
    expect(cost[Resource.gold]).toBe(buildingCost);
    performAction('build_plow_workshop', ctx);
    expect(ctx.activePlayer.buildings.has('plow_workshop')).toBe(true);
    expect(ctx.activePlayer.actions.has('plow')).toBe(true);
  });
});
