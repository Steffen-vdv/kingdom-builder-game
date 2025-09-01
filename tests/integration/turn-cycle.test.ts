import { describe, it, expect } from 'vitest';
import { createEngine, advance } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
} from '@kingdom-builder/contents';

describe('Turn cycle integration', () => {
  it('advances players through all phases sequentially', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
    });
    const [growthId, , mainId] = PHASES.map((p) => p.id);
    // player A development & upkeep
    while (ctx.game.currentPhase !== mainId) advance(ctx);
    expect(ctx.game.currentPlayerIndex).toBe(0);
    expect(ctx.game.currentPhase).toBe(mainId);
    // end main for player A
    advance(ctx);
    // player B development & upkeep
    while (ctx.game.currentPhase !== mainId) advance(ctx);
    expect(ctx.game.currentPlayerIndex).toBe(1);
    expect(ctx.game.currentPhase).toBe(mainId);
    // end main for player B
    advance(ctx);
    expect(ctx.game.turn).toBe(2);
    expect(ctx.game.currentPlayerIndex).toBe(0);
    expect(ctx.game.currentPhase).toBe(growthId);
  });
});
