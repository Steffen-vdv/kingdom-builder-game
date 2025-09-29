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
    const result = resolveAttack(defender, 10, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    expect(result.damageDealt).toBe(5);
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
    const result = resolveAttack(defender, 5, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    expect(result.damageDealt).toBe(4);
    expect(defender.resources[Resource.castleHP]).toBe(
      startHP - result.damageDealt,
    );
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
    const result = resolveAttack(defender, 1, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    expect(result.damageDealt).toBe(1);
    expect(defender.resources[Resource.castleHP]).toBe(start - 1);
  });

  it('rounds absorbed damage to nearest when rules specify', () => {
    const ctx = createTestEngine();
    const defender = ctx.game.opponent;
    ctx.services.rules.absorptionRounding = 'nearest';
    defender.absorption = 0.6;
    const result = resolveAttack(defender, 1, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    expect(result.damageDealt).toBe(0);
  });

  it('can ignore absorption and fortification when options specify', () => {
    const ctx = createTestEngine();
    const defender = ctx.game.opponent;
    defender.absorption = 0.5;
    defender.stats[Stat.fortificationStrength] = 5;
    const result = resolveAttack(
      defender,
      10,
      ctx,
      { type: 'resource', key: Resource.castleHP },
      {
        ignoreAbsorption: true,
        ignoreFortification: true,
      },
    );
    expect(result.damageDealt).toBe(10);
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
    const result = resolveAttack(defender, 4, ctx, {
      type: 'resource',
      key: Resource.castleHP,
    });
    expect(result.damageDealt).toBe(0);
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
    const result = resolveAttack(
      defender,
      attacker.armyStrength as number,
      ctx,
      {
        type: 'resource',
        key: Resource.castleHP,
      },
    );
    const rounding = ctx.services.rules.absorptionRounding;
    const base = attacker.armyStrength as number;
    const reduced =
      rounding === 'down'
        ? Math.floor(base * (1 - 0.5))
        : rounding === 'up'
          ? Math.ceil(base * (1 - 0.5))
          : Math.round(base * (1 - 0.5));
    const expected = Math.max(0, reduced - 1);
    expect(result.damageDealt).toBe(expected);
    expect(defender.resources[Resource.castleHP]).toBe(startHP - expected);
    // post-attack boosts apply after damage calculation
    expect(defender.absorption).toBe(1);
    expect(defender.fortificationStrength).toBe(5);
  });

  it('keeps buildings intact when damage is fully mitigated', () => {
    const content = createContentFactory();
    const bastion = content.building({});
    const ctx = createTestEngine({ buildings: content.buildings });
    const defender = ctx.game.opponent;
    ctx.game.currentPlayerIndex = 1;
    runEffects(
      [
        {
          type: 'building',
          method: 'add',
          params: { id: bastion.id },
        },
      ],
      ctx,
    );
    ctx.game.currentPlayerIndex = 0;
    defender.absorption = 1;
    defender.fortificationStrength = 0;

    const castleBefore = defender.resources[Resource.castleHP];
    const result = resolveAttack(defender, 3, ctx, {
      type: 'building',
      id: bastion.id,
    });

    expect(result.damageDealt).toBe(0);
    expect(defender.buildings.has(bastion.id)).toBe(true);
    expect(defender.resources[Resource.castleHP]).toBe(castleBefore);
    expect(result.evaluation.target.type).toBe('building');
    if (result.evaluation.target.type === 'building') {
      expect(result.evaluation.target.existed).toBe(true);
      expect(result.evaluation.target.destroyed).toBe(false);
      expect(result.evaluation.target.damage).toBe(0);
    }
  });

  it('destroys buildings without spilling damage onto the castle', () => {
    const content = createContentFactory();
    const fortress = content.building({
      onBuild: [
        {
          type: 'stat',
          method: 'add',
          params: { key: Stat.fortificationStrength, amount: 3 },
        },
      ],
    });
    const ctx = createTestEngine({ buildings: content.buildings });
    const defender = ctx.game.opponent;
    ctx.game.currentPlayerIndex = 1;
    runEffects(
      [
        {
          type: 'building',
          method: 'add',
          params: { id: fortress.id },
        },
      ],
      ctx,
    );
    ctx.game.currentPlayerIndex = 0;

    const castleBefore = defender.resources[Resource.castleHP];
    expect(defender.fortificationStrength).toBe(3);

    const result = resolveAttack(defender, 5, ctx, {
      type: 'building',
      id: fortress.id,
    });

    expect(result.damageDealt).toBe(2);
    expect(defender.buildings.has(fortress.id)).toBe(false);
    expect(defender.resources[Resource.castleHP]).toBe(castleBefore);
    expect(defender.fortificationStrength).toBe(0);
    expect(result.evaluation.target.type).toBe('building');
    if (result.evaluation.target.type === 'building') {
      expect(result.evaluation.target.destroyed).toBe(true);
      expect(result.evaluation.target.damage).toBe(result.damageDealt);
    }
  });

  it('respects ignore flags when targeting buildings', () => {
    const content = createContentFactory();
    const stronghold = content.building({});
    const ctx = createTestEngine({ buildings: content.buildings });
    const defender = ctx.game.opponent;
    ctx.game.currentPlayerIndex = 1;
    runEffects(
      [
        {
          type: 'building',
          method: 'add',
          params: { id: stronghold.id },
        },
      ],
      ctx,
    );
    ctx.game.currentPlayerIndex = 0;

    defender.absorption = 0.9;
    defender.fortificationStrength = 10;
    const castleBefore = defender.resources[Resource.castleHP];

    const result = resolveAttack(
      defender,
      4,
      ctx,
      {
        type: 'building',
        id: stronghold.id,
      },
      { ignoreAbsorption: true, ignoreFortification: true },
    );

    expect(result.damageDealt).toBe(4);
    expect(result.evaluation.absorption.ignored).toBe(true);
    expect(result.evaluation.fortification.ignored).toBe(true);
    expect(defender.fortificationStrength).toBe(10);
    expect(defender.resources[Resource.castleHP]).toBe(castleBefore);
    expect(defender.buildings.has(stronghold.id)).toBe(false);
    expect(result.evaluation.target.type).toBe('building');
    if (result.evaluation.target.type === 'building')
      expect(result.evaluation.target.destroyed).toBe(true);
  });
});
