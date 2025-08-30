import { describe, it, expect } from 'vitest';
import { createEngine, performAction, advance } from '../../src/index.ts';

describe('Garden development', () => {
  it('cannot be manually developed', () => {
    const ctx = createEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const landId = ctx.activePlayer.lands[0].id;
    expect(() =>
      performAction('develop', ctx, { id: 'garden', landId }),
    ).toThrow(/system/);
  });
});
