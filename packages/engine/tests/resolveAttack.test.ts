import { describe, it, expect } from 'vitest';
import { resolveAttack, runEffects, type EffectDef } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource, Stat } from '../src/state/index.ts';
import { createContentFactory } from './factories/content.ts';

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
    const dmg = resolveAttack(defender, 10, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
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
    const dmg = resolveAttack(defender, 5, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
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
    const dmg = resolveAttack(defender, 1, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    expect(dmg).toBe(1);
    expect(defender.resources[Resource.castleHP]).toBe(start - 1);
  });

  it('rounds absorbed damage to nearest when rules specify', () => {
    const ctx = createTestEngine();
    const defender = ctx.game.opponent;
    ctx.services.rules.absorptionRounding = 'nearest';
    defender.absorption = 0.6;
    const dmg = resolveAttack(defender, 1, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    expect(dmg).toBe(0);
  });

  it('can ignore absorption and fortification when options specify', () => {
    const ctx = createTestEngine();
    const defender = ctx.game.opponent;
    defender.absorption = 0.5;
    defender.stats[Stat.fortificationStrength] = 5;
    const dmg = resolveAttack(
      defender,
      10,
      ctx,
      { type: 'resource', key: Resource.castleHP },
      {
        ignoreAbsorption: true,
        ignoreFortification: true,
      },
    );
    expect(dmg).toBe(10);
    expect(defender.fortificationStrength).toBe(5);
    expect(defender.resources[Resource.castleHP]).toBe(0);
  });

  it('resolves post-damage triggers like watchtower removal', () => {
    const content = createContentFactory();
    const tower = content.development({
      onBeforeAttacked: [
        {
          type: 'stat',
          method: 'add',
          params: { key: Stat.fortificationStrength, amount: 4 },
        },
      ],
      onAttackResolved: [
        {
          type: 'resource',
          method: 'add',
          params: { key: Resource.gold, amount: 1 },
        },
      ],
    });
    const ctx = createTestEngine({ developments: content.developments });
    const defender = ctx.game.opponent;
    const landId = defender.lands[1].id;
    ctx.game.currentPlayerIndex = 1; // switch to defender to build tower
    runEffects(
      [
        {
          type: 'development',
          method: 'add',
          params: { id: tower.id, landId },
        },
      ],
      ctx,
    );
    ctx.game.currentPlayerIndex = 0; // attacker turn
    const beforeGold = defender.gold;
    const dmg = resolveAttack(defender, 4, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    expect(dmg).toBe(0);
    expect(defender.resources[Resource.castleHP]).toBe(10);
    expect(defender.fortificationStrength).toBe(0);
    expect(defender.absorption).toBe(0);
    expect(defender.gold).toBe(beforeGold + 1);
  });

  it('uses pre-attack stat boosts but ignores post-attack ones for damage', () => {
    const ctx = createTestEngine();
    const attacker = ctx.activePlayer;
    const defender = ctx.game.opponent;
    ctx.game.currentPlayerIndex = 1; // switch to defender to add passive
    ctx.passives.addPassive(
      {
        id: 'bastion',
        effects: [],
        onBeforeAttacked: [
          {
            type: 'stat',
            method: 'add',
            params: { key: Stat.absorption, amount: 0.5 },
          },
          {
            type: 'stat',
            method: 'add',
            params: { key: Stat.fortificationStrength, amount: 1 },
          },
        ],
        onAttackResolved: [
          {
            type: 'stat',
            method: 'add',
            params: { key: Stat.absorption, amount: 0.5 },
          },
          {
            type: 'stat',
            method: 'add',
            params: { key: Stat.fortificationStrength, amount: 5 },
          },
        ],
      },
      ctx,
    );
    ctx.game.currentPlayerIndex = 0; // attacker turn

    runEffects(
      [
        {
          type: 'stat',
          method: 'add',
          params: { key: Stat.armyStrength, amount: 5 },
        },
      ],
      ctx,
    );
    const startHP = defender.resources[Resource.castleHP];
    const dmg = resolveAttack(defender, attacker.armyStrength as number, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    const rounding = ctx.services.rules.absorptionRounding;
    const base = attacker.armyStrength as number;
    const reduced =
      rounding === 'down'
        ? Math.floor(base * (1 - 0.5))
        : rounding === 'up'
          ? Math.ceil(base * (1 - 0.5))
          : Math.round(base * (1 - 0.5));
    const expected = Math.max(0, reduced - 1);
    expect(dmg).toBe(expected);
    expect(defender.resources[Resource.castleHP]).toBe(startHP - expected);
    // post-attack boosts apply after damage calculation
    expect(defender.absorption).toBe(1);
    expect(defender.fortificationStrength).toBe(5);
  });
});
