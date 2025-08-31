import { describe, it, expect } from 'vitest';
import { resolveAttack, runEffects } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource, Stat } from '../src/state/index.ts';
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

  it('applies fortification, castle damage, happiness and plunder before post triggers', () => {
    const ctx = createTestEngine();
    const attacker = ctx.activePlayer;
    const defender = ctx.game.opponent;
    defender.stats[Stat.fortificationStrength] = 1;
    defender.gold = 100;
    attacker.gold = 0;
    const dmg = resolveAttack(defender, 5, ctx);
    expect(dmg).toBe(4);
    expect(defender.resources[Resource.castleHP]).toBe(6);
    expect(defender.happiness).toBe(-1);
    expect(attacker.happiness).toBe(1);
    expect(defender.gold).toBe(75);
    expect(attacker.gold).toBe(25);
  });

  it('resolves post-damage triggers like watchtower removal', () => {
    const ctx = createTestEngine();
    const defender = ctx.game.opponent;
    const landId = defender.lands[1].id;
    ctx.game.currentPlayerIndex = 1; // switch to defender to build watchtower
    runEffects(
      [
        {
          type: 'development',
          method: 'add',
          params: { id: 'watchtower', landId },
        },
      ],
      ctx,
    );
    ctx.game.currentPlayerIndex = 0; // attacker turn
    const dmg = resolveAttack(defender, 4, ctx);
    expect(dmg).toBe(0);
    expect(defender.resources[Resource.castleHP]).toBe(10);
    expect(defender.fortificationStrength).toBe(0);
    expect(defender.absorption).toBe(0);
    expect(defender.lands[1].developments).not.toContain('watchtower');
  });
});
