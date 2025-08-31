import { describe, it, expect } from 'vitest';
import { runEffects } from '../../src/index.ts';
import { Resource, Stat } from '../../src/state/index.ts';
import { createTestEngine } from '../helpers.ts';
import type { EffectDef } from '../../src/effects/index.ts';

describe('passive:add effect', () => {
  it('applies nested effects and registers phase triggers', () => {
    const ctx = createTestEngine();
    const effect: EffectDef<{ id: string } & Record<string, EffectDef[]>> = {
      type: 'passive',
      method: 'add',
      params: {
        id: 'temp',
        onGrowthPhase: [
          {
            type: 'resource',
            method: 'add',
            params: { key: Resource.gold, amount: 1 },
          },
        ],
        onUpkeepPhase: [
          {
            type: 'resource',
            method: 'add',
            params: { key: Resource.gold, amount: 1 },
          },
        ],
        onBeforeAttacked: [
          {
            type: 'resource',
            method: 'add',
            params: { key: Resource.gold, amount: 1 },
          },
        ],
        onAttackResolved: [
          {
            type: 'resource',
            method: 'add',
            params: { key: Resource.gold, amount: 1 },
          },
        ],
      },
      effects: [
        {
          type: 'stat',
          method: 'add',
          params: { key: Stat.armyStrength, amount: 1 },
        },
      ],
    };

    const before = ctx.activePlayer.stats[Stat.armyStrength];
    runEffects([effect], ctx);
    expect(ctx.activePlayer.stats[Stat.armyStrength]).toBe(before + 1);
    ctx.passives.removePassive('temp', ctx);
    expect(ctx.activePlayer.stats[Stat.armyStrength]).toBe(before);
  });
});
