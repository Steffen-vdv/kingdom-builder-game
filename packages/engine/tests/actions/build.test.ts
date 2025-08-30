import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  Resource,
  getActionCosts,
  runEffects,
  advance,
} from '../../src/index.ts';

describe('Build action', () => {
  it('rejects when gold is insufficient', () => {
    const ctx = createEngine();
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const cost = getActionCosts('build', ctx, { id: 'town_charter' });
    ctx.activePlayer.gold = (cost[Resource.gold] || 0) - 1;
    expect(() => performAction('build', ctx, { id: 'town_charter' })).toThrow(
      /Insufficient gold/,
    );
  });

  it('adds Town Charter modifying Expand until removed', () => {
    const ctx = createEngine();
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;

    const baseCost = getActionCosts('expand', ctx);
    performAction('build', ctx, { id: 'town_charter' });
    expect(ctx.activePlayer.buildings.has('town_charter')).toBe(true);
    const modifiedCost = getActionCosts('expand', ctx);
    expect(modifiedCost).not.toEqual(baseCost);

    runEffects(
      [{ type: 'building', method: 'remove', params: { id: 'town_charter' } }],
      ctx,
    );
    expect(ctx.activePlayer.buildings.has('town_charter')).toBe(false);
    const revertedCost = getActionCosts('expand', ctx);
    expect(revertedCost).toEqual(baseCost);
  });
});
