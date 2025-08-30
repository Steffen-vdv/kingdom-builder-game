import { describe, it, expect } from 'vitest';
import { createEngine, advance } from '../../packages/engine/src';

describe('Turn cycle integration', () => {
  it('advances players through all phases sequentially', () => {
    const ctx = createEngine();
    // player A development & upkeep
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    expect(ctx.game.currentPlayerIndex).toBe(0);
    expect(ctx.game.currentPhase).toBe('main');
    // end main for player A
    advance(ctx);
    // player B development & upkeep
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    expect(ctx.game.currentPlayerIndex).toBe(1);
    expect(ctx.game.currentPhase).toBe('main');
    // end main for player B
    advance(ctx);
    expect(ctx.game.turn).toBe(2);
    expect(ctx.game.currentPlayerIndex).toBe(0);
    expect(ctx.game.currentPhase).toBe('development');
  });
});
