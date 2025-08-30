import { describe, it, expect } from 'vitest';
import {
  createEngine,
  startTurn,
  runCurrentStep,
} from '../../packages/engine/src';

describe('Turn cycle integration', () => {
  it('advances through development and upkeep to main phase', () => {
    const ctx = createEngine();
    startTurn(ctx, 0);
    let guard = 0;
    while (ctx.game.currentPhase !== 'main' && guard < 10) {
      runCurrentStep(ctx);
      guard++;
    }
    expect(ctx.game.currentPhase).toBe('main');
  });
});
