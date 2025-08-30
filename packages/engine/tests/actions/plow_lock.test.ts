import { describe, it, expect } from 'vitest';
import { createEngine, performAction, advance } from '../../src/index.ts';

describe('Plow action lock', () => {
  it('is locked until Plow Workshop is built', () => {
    const ctx = createEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    expect(() => performAction('plow', ctx)).toThrow(/locked/);
    performAction('build', ctx, { id: 'plow_workshop' });
    ctx.activePlayer.ap += 1;
    ctx.activePlayer.gold += 6;
    expect(ctx.activePlayer.actions.has('plow')).toBe(true);
    expect(() => performAction('plow', ctx)).not.toThrow();
  });
});
