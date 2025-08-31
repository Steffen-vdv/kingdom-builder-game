import { describe, it, expect } from 'vitest';
import {
  performAction,
  getActionRequirements,
  advance,
  runEffects,
  type EffectDef,
} from '../../src';
import { PopulationRole, Resource, Stat } from '../../src/state';
import { createTestEngine } from '../helpers.ts';

describe('Army Attack action', () => {
  it('blocks when war weariness is not lower than commanders', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    ctx.activePlayer.warWeariness = 2;
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const failures = getActionRequirements('army_attack', ctx);
    expect(failures).toHaveLength(1);
    expect(() => performAction('army_attack', ctx)).toThrow();
  });

  it('allows attack when war weariness is lower than commanders', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 2;
    ctx.activePlayer.warWeariness = 1;
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const failures = getActionRequirements('army_attack', ctx);
    expect(failures).toHaveLength(0);
    expect(() => performAction('army_attack', ctx)).not.toThrow();
  });

  it('calculates attack power with modifiers, damages castle, plunders and adds war weariness', () => {
    const ctx = createTestEngine();
    const attacker = ctx.activePlayer;
    const defender = ctx.game.opponent;
    attacker.population[PopulationRole.Commander] = 1;
    attacker.armyStrength = 3;
    defender.gold = 100;
    const startHP = defender.resources[Resource.castleHP];
    const startGold = defender.gold;
    runEffects(
      [
        {
          type: 'result_mod',
          method: 'add',
          params: {
            id: 'boost',
            evaluation: { type: 'attack', id: 'power' },
            adjust: 2,
          },
        },
      ],
      ctx,
    );
    ctx.game.currentPlayerIndex = 1;
    ctx.passives.addPassive(
      {
        id: 'shield',
        effects: [],
        onBeforeAttacked: [
          {
            type: 'stat',
            method: 'add',
            params: { key: Stat.absorption, amount: 0.4 },
          },
        ],
      },
      ctx,
    );
    ctx.game.currentPlayerIndex = 0;
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    attacker.gold = 0;
    performAction('army_attack', ctx);
    const plunderDef = ctx.actions.get('plunder');
    const plunderEffect = plunderDef.effects[0] as EffectDef<{
      percent?: number;
    }>;
    const percent = plunderEffect.params?.percent ?? 0;
    const expectedPlunder = Math.floor((startGold * percent) / 100);
    const expectedDamage = Math.floor((attacker.armyStrength + 2) * (1 - 0.4));
    expect(defender.resources[Resource.castleHP]).toBe(
      startHP - expectedDamage,
    );
    expect(attacker.warWeariness).toBe(1);
    expect(attacker.gold).toBe(expectedPlunder);
    expect(defender.gold).toBe(startGold - expectedPlunder);
  });
});
