import { describe, it, expect } from 'vitest';
import { resolveAttack } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Stat } from '../src/state/index.ts';
import type { EffectDef } from '../src/effects';

function makeAbsorptionEffect(amount: number): EffectDef {
  return {
    type: 'stat',
    method: 'add',
    params: { key: Stat.absorption, amount },
  };
}

describe('resolveAttack', () => {
  it('runs onBeforeAttacked triggers before damage calc', () => {
    const ctx = createTestEngine();
    const defender = ctx.activePlayer;
    ctx.passives.addPassive(
      {
        id: 'shield',
        effects: [],
        onBeforeAttacked: [makeAbsorptionEffect(0.5)],
      },
      ctx,
    );
    const dmg = resolveAttack(defender, 10, ctx);
    expect(dmg).toBe(5);
  });
});
