import { describe, it, expect } from 'vitest';
import { Services, DefaultRules } from '../../src/services/index.ts';
import { PlayerState, Land, Resource } from '../../src/state/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('Services', () => {
  it('evaluates happiness tiers correctly', () => {
    const services = new Services(DefaultRules);
    expect(services.happiness.tier(0)?.incomeMultiplier).toBe(1);
    expect(services.happiness.tier(4)?.incomeMultiplier).toBe(1.25);
    expect(services.happiness.tier(5)?.buildingDiscountPct).toBe(0.2);
    expect(services.happiness.tier(8)?.incomeMultiplier).toBe(1.5);
  });

  it('calculates population cap from houses on land', () => {
    const services = new Services(DefaultRules);
    const player = new PlayerState('A', 'Test');
    const land1 = new Land('l1', 1);
    land1.developments.push('house');
    const land2 = new Land('l2', 2);
    land2.developments.push('farm', 'house');
    player.lands = [land1, land2];
    const cap = services.popcap.getCap(player);
    // base castle houses (1) + 2 houses on land
    expect(cap).toBe(3);
  });
});

describe('PassiveManager', () => {
  it('applies and unregisters cost modifiers', () => {
    const ctx = createTestEngine();
    const base = { [Resource.gold]: 2 };
    ctx.passives.registerCostModifier('tax', (action, cost) => ({
      ...cost,
      [Resource.gold]: (cost[Resource.gold] || 0) + 1,
    }));
    const modified = ctx.passives.applyCostMods('expand', base, ctx);
    expect(modified[Resource.gold]).toBe(3);
    ctx.passives.unregisterCostModifier('tax');
    const reverted = ctx.passives.applyCostMods('expand', base, ctx);
    expect(reverted[Resource.gold]).toBe(2);
  });

  it('runs result modifiers and handles passives', () => {
    const ctx = createTestEngine();
    ctx.passives.registerResultModifier('happy', (_a, innerCtx) => {
      innerCtx.activePlayer.happiness += 1;
    });
    ctx.passives.runResultMods('expand', ctx);
    expect(ctx.activePlayer.happiness).toBe(1);
    ctx.passives.unregisterResultModifier('happy');

    const passive = {
      id: 'shiny',
      effects: [
        {
          type: 'resource',
          method: 'add',
          params: { key: Resource.gold, amount: 2 },
        },
      ],
    };
    const before = ctx.activePlayer.gold;
    ctx.passives.addPassive(passive, ctx);
    expect(ctx.passives.list()).toContain('shiny');
    expect(ctx.activePlayer.gold).toBe(before + 2);
    ctx.passives.removePassive('shiny', ctx);
    expect(ctx.passives.list()).not.toContain('shiny');
    expect(ctx.activePlayer.gold).toBe(before);
    // removing non-existent passive is a no-op
    ctx.passives.removePassive('unknown', ctx);
  });
});
