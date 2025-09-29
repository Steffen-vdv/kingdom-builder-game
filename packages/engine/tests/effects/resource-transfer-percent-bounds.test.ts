import { describe, it, expect } from 'vitest';
import { runEffects, advance, Resource } from '../../src/index.ts';
import {
  TRANSFER_PCT_EVALUATION_ID,
  TRANSFER_PCT_EVALUATION_TYPE,
} from '../../src/effects/resource_transfer.ts';
import { createTestEngine } from '../helpers.ts';
import type { EffectDef } from '../../src/effects/index.ts';

describe('resource:transfer percent bounds', () => {
  it('adjusts transfer percentage within bounds', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    ctx.game.currentPlayerIndex = 0;

    const transfer: EffectDef<{ key: string; percent: number }> = {
      type: 'resource',
      method: 'transfer',
      params: { key: Resource.gold, percent: 50 },
    };
    const addBoost: EffectDef<{ id: string }> = {
      type: 'result_mod',
      method: 'add',
      params: {
        id: 'boost',
        evaluation: {
          type: TRANSFER_PCT_EVALUATION_TYPE,
          id: TRANSFER_PCT_EVALUATION_ID,
        },
        adjust: 80,
      },
    };
    const removeBoost: EffectDef<{ id: string }> = {
      type: 'result_mod',
      method: 'remove',
      params: {
        id: 'boost',
        evaluation: {
          type: TRANSFER_PCT_EVALUATION_TYPE,
          id: TRANSFER_PCT_EVALUATION_ID,
        },
      },
    };
    const addNerf: EffectDef<{ id: string }> = {
      type: 'result_mod',
      method: 'add',
      params: {
        id: 'nerf',
        evaluation: {
          type: TRANSFER_PCT_EVALUATION_TYPE,
          id: TRANSFER_PCT_EVALUATION_ID,
        },
        adjust: -200,
      },
    };

    ctx.activePlayer.gold = 0;
    ctx.opponent.gold = 10;
    const total = ctx.opponent.gold;

    runEffects([addBoost], ctx);
    runEffects([transfer], ctx);
    expect(ctx.activePlayer.gold).toBe(total);
    expect(ctx.opponent.gold).toBe(0);

    runEffects([removeBoost], ctx);
    ctx.activePlayer.gold = 0;
    ctx.opponent.gold = total;

    runEffects([addNerf], ctx);
    runEffects([transfer], ctx);
    expect(ctx.activePlayer.gold).toBe(0);
    expect(ctx.opponent.gold).toBe(total);
  });
});
