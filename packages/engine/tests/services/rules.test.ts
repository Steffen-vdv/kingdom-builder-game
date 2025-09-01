import { describe, it, expect } from 'vitest';
import { Services } from '../../src/services/index.ts';
import { PlayerState, Land } from '../../src/state/index.ts';
import { createTestEngine } from '../helpers.ts';
import {
  DEVELOPMENTS,
  RULES,
  Resource as CResource,
} from '@kingdom-builder/contents';
import { getActionCosts } from '../../src/index.ts';

describe('Services', () => {
  it('evaluates resource tiers correctly', () => {
    const services = new Services(RULES, DEVELOPMENTS);
    const getTierEffect = (value: number) =>
      RULES.tierDefinitions.filter((t) => t.threshold <= value).at(-1)
        ?.effect || {};
    expect(services.tieredResource.tier(0)?.incomeMultiplier).toBe(
      getTierEffect(0).incomeMultiplier,
    );
    expect(services.tieredResource.tier(4)?.incomeMultiplier).toBe(
      getTierEffect(4).incomeMultiplier,
    );
    expect(services.tieredResource.tier(5)?.buildingDiscountPct).toBe(
      getTierEffect(5).buildingDiscountPct,
    );
    expect(services.tieredResource.tier(8)?.incomeMultiplier).toBe(
      getTierEffect(8).incomeMultiplier,
    );
  });

  it('calculates population cap from houses on land', () => {
    const services = new Services(RULES, DEVELOPMENTS);
    const player = new PlayerState('A', 'Test');
    const [farmId, houseId] = Array.from(
      (DEVELOPMENTS as unknown as { map: Map<string, unknown> }).map.keys(),
    );
    const land1 = new Land('l1', 1);
    land1.developments.push(houseId);
    const land2 = new Land('l2', 2);
    land2.developments.push(farmId, houseId);
    player.lands = [land1, land2];
    const cap = services.popcap.getCap(player);
    const houseCap =
      DEVELOPMENTS.get(houseId).onBuild.find((e) => e.type === 'stat')
        ?.params?.['amount'] ?? 0;
    const baseCap = RULES.basePopulationCap;
    expect(cap).toBe(baseCap + houseCap * 2);
  });
});

describe('PassiveManager', () => {
  it('applies and unregisters cost modifiers', () => {
    const ctx = createTestEngine();
    const baseCost = getActionCosts('expand', ctx);
    const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
    ctx.passives.registerCostModifier('tax', (_action, cost) => ({
      ...cost,
      [CResource.gold]: (cost[CResource.gold] || 0) + 1,
    }));
    const modified = ctx.passives.applyCostMods('expand', base, ctx);
    expect(modified[CResource.gold]).toBe((base[CResource.gold] || 0) + 1);
    ctx.passives.unregisterCostModifier('tax');
    const reverted = ctx.passives.applyCostMods('expand', base, ctx);
    expect(reverted[CResource.gold]).toBe(base[CResource.gold]);
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
          params: { key: CResource.gold, amount: 2 },
        },
      ],
    };
    const before = ctx.activePlayer.gold;
    ctx.passives.addPassive(passive, ctx);
    expect(ctx.passives.list(ctx.activePlayer.id)).toContain('shiny');
    expect(ctx.activePlayer.gold).toBe(before + 2);
    ctx.passives.removePassive('shiny', ctx);
    expect(ctx.passives.list(ctx.activePlayer.id)).not.toContain('shiny');
    expect(ctx.activePlayer.gold).toBe(before);
    // removing non-existent passive is a no-op
    ctx.passives.removePassive('unknown', ctx);
  });
});
