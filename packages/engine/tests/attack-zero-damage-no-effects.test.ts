import { describe, it, expect } from 'vitest';
import { runEffects, type EffectDef, type AttackLog } from '../src/index.ts';
import { Resource } from '../src/state/index.ts';
import { createTestEngine } from './helpers.ts';

describe('attack:perform', () => {
  it('does not run onDamage effects when damage is fully absorbed', () => {
    const ctx = createTestEngine();
    const attacker = ctx.activePlayer;
    const defender = ctx.opponent;

    attacker.armyStrength = 1;
    defender.absorption = 1;
    defender.fortificationStrength = 0;

    const before = {
      attacker: {
        hp: attacker.resources[Resource.castleHP],
        gold: attacker.gold,
        happiness: attacker.happiness,
      },
      defender: {
        hp: defender.resources[Resource.castleHP],
        gold: defender.gold,
        happiness: defender.happiness,
      },
    };

    const effect: EffectDef = {
      type: 'attack',
      method: 'perform',
      params: {
        target: { type: 'resource', key: Resource.castleHP },
        onDamage: {
          attacker: [
            {
              type: 'resource',
              method: 'add',
              params: { key: Resource.gold, amount: 1 },
            },
            {
              type: 'resource',
              method: 'add',
              params: { key: Resource.happiness, amount: 1 },
            },
          ],
          defender: [
            {
              type: 'resource',
              method: 'add',
              params: { key: Resource.gold, amount: 1 },
            },
            {
              type: 'resource',
              method: 'add',
              params: { key: Resource.happiness, amount: 1 },
            },
          ],
        },
      },
    };

    runEffects([effect], ctx);

    expect(attacker.resources[Resource.castleHP]).toBe(before.attacker.hp);
    expect(attacker.gold).toBe(before.attacker.gold);
    expect(attacker.happiness).toBe(before.attacker.happiness);
    expect(defender.resources[Resource.castleHP]).toBe(before.defender.hp);
    expect(defender.gold).toBe(before.defender.gold);
    expect(defender.happiness).toBe(before.defender.happiness);
  });

  it('applies attacker and defender onDamage effects when damage lands', () => {
    const ctx = createTestEngine();
    const attacker = ctx.activePlayer;
    const defender = ctx.opponent;

    attacker.armyStrength = 3;
    attacker.happiness = 1;
    defender.happiness = 3;

    const effect: EffectDef = {
      type: 'attack',
      method: 'perform',
      params: {
        target: { type: 'resource', key: Resource.castleHP },
        onDamage: {
          attacker: [
            {
              type: 'resource',
              method: 'add',
              params: { key: Resource.happiness, amount: 1 },
            },
          ],
          defender: [
            {
              type: 'resource',
              method: 'add',
              params: { key: Resource.happiness, amount: -1 },
            },
          ],
        },
      },
    };

    runEffects([effect], ctx);

    expect(attacker.happiness).toBe(2);
    expect(defender.happiness).toBe(2);

    const log = ctx.pullEffectLog<AttackLog>('attack:perform');
    expect(log).toBeDefined();
    const defenderEntries = log!.onDamage.filter(
      (entry) => entry.owner === 'defender',
    );
    expect(defenderEntries).toHaveLength(1);
    const defenderDiffs = defenderEntries[0]!.defender.filter(
      (diff) => diff.type === 'resource' && diff.key === Resource.happiness,
    );
    expect(defenderDiffs).toHaveLength(1);
    expect(defenderDiffs[0]!.before).toBe(3);
    expect(defenderDiffs[0]!.after).toBe(2);
  });
});
