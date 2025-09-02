import { describe, it, expect } from 'vitest';
import { runEffects, type EffectDef } from '../src/index.ts';
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
});
