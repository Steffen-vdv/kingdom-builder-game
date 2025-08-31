import { describe, it, expect } from 'vitest';
import {
  performAction,
  getActionCosts,
  runEffects,
  advance,
} from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { BUILDINGS, Resource as CResource } from '@kingdom-builder/contents';

describe('Build action', () => {
  it('rejects when gold is insufficient', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const [townCharterId] = Array.from(
      (BUILDINGS as unknown as { map: Map<string, unknown> }).map.keys(),
    );
    const cost = getActionCosts('build', ctx, { id: townCharterId });
    ctx.activePlayer.gold = (cost[CResource.gold] || 0) - 1;
    expect(() => performAction('build', ctx, { id: townCharterId })).toThrow(
      /Insufficient gold/,
    );
  });

  it('adds Town Charter modifying Expand until removed', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);

    const baseCost = getActionCosts('expand', ctx);
    const [townCharterId] = Array.from(
      (BUILDINGS as unknown as { map: Map<string, unknown> }).map.keys(),
    );
    performAction('build', ctx, { id: townCharterId });
    expect(ctx.activePlayer.buildings.has(townCharterId)).toBe(true);
    const modifiedCost = getActionCosts('expand', ctx);
    expect(modifiedCost).not.toEqual(baseCost);

    runEffects(
      [{ type: 'building', method: 'remove', params: { id: townCharterId } }],
      ctx,
    );
    expect(ctx.activePlayer.buildings.has(townCharterId)).toBe(false);
    const revertedCost = getActionCosts('expand', ctx);
    expect(revertedCost).toEqual(baseCost);
  });
});
