import { describe, it, expect } from 'vitest';
import { resolveAttack, runEffects, type EffectDef } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource, Stat } from '../src/state/index.ts';

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

  it('applies fortification and castle damage before post triggers', () => {
    const ctx = createTestEngine();
    const attacker = ctx.activePlayer;
    const defender = ctx.game.opponent;
    defender.stats[Stat.fortificationStrength] = 1;
    defender.gold = 100;
    attacker.gold = 0;
    const startHP = defender.resources[Resource.castleHP];
    const startGold = defender.gold;
    const dmg = resolveAttack(defender, 5, ctx);
    expect(dmg).toBe(4);
    expect(defender.resources[Resource.castleHP]).toBe(startHP - dmg);
    expect(defender.fortificationStrength).toBe(0);
    // ensure no content-driven effects run inside resolveAttack
    expect(defender.gold).toBe(startGold);
    expect(attacker.gold).toBe(0);
    expect(defender.happiness).toBe(0);
    expect(attacker.happiness).toBe(0);
    expect(attacker.warWeariness).toBe(0);
  });

  it('rounds absorbed damage up when rules specify', () => {
    const ctx = createTestEngine();
    const defender = ctx.game.opponent;
    ctx.services.rules.absorptionRounding = 'up';
    defender.absorption = 0.5;
    const start = defender.resources[Resource.castleHP];
    const dmg = resolveAttack(defender, 1, ctx);
    expect(dmg).toBe(1);
    expect(defender.resources[Resource.castleHP]).toBe(start - 1);
  });

  it('rounds absorbed damage to nearest when rules specify', () => {
    const ctx = createTestEngine();
    const defender = ctx.game.opponent;
    ctx.services.rules.absorptionRounding = 'nearest';
    defender.absorption = 0.6;
    const dmg = resolveAttack(defender, 1, ctx);
    expect(dmg).toBe(0);
  });

  it('can ignore absorption and fortification when options specify', () => {
    const ctx = createTestEngine();
    const defender = ctx.game.opponent;
    defender.absorption = 0.5;
    defender.stats[Stat.fortificationStrength] = 5;
    const dmg = resolveAttack(defender, 10, ctx, {
      ignoreAbsorption: true,
      ignoreFortification: true,
    });
    expect(dmg).toBe(10);
    expect(defender.fortificationStrength).toBe(5);
    expect(defender.resources[Resource.castleHP]).toBe(0);
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
