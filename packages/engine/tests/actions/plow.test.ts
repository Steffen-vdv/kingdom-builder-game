import { describe, it, expect } from 'vitest';
import {
  performAction,
  getActionCosts,
  Resource,
  collectTriggerEffects,
  runEffects,
  advance,
  type EngineContext,
} from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';

function countTilled(ctx: EngineContext): number {
  return ctx.activePlayer.lands.filter((l) => l.tilled).length;
}

describe('Plow action', () => {
  it('expands, tills and adds temporary cost modifier', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    ctx.activePlayer.gold += 20;
    const baseCost = getActionCosts('expand', ctx);
    performAction('build', ctx, { id: 'plow_workshop' });
    ctx.activePlayer.ap += 1;
    const landsBefore = ctx.activePlayer.lands.length;
    const tilledBefore = countTilled(ctx);
    performAction('plow', ctx);
    expect(ctx.activePlayer.lands.length).toBe(landsBefore + 1);
    expect(countTilled(ctx)).toBe(tilledBefore + 1);
    const modified = getActionCosts('expand', ctx);
    expect(modified[Resource.gold]).toBe((baseCost[Resource.gold] || 0) + 2);
    runEffects(collectTriggerEffects('onUpkeepPhase', ctx), ctx);
    const reverted = getActionCosts('expand', ctx);
    expect(reverted[Resource.gold]).toBe(baseCost[Resource.gold] || 0);
  });
});
