import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';

describe('building:add effect', () => {
  it('adds building and applies its passives', () => {
    const content = createContentFactory();
    const target = content.action({ baseCosts: { [CResource.gold]: 4 } });
    const building = content.building({
      costs: { [CResource.gold]: 3 },
      onBuild: [
        {
          type: 'cost_mod',
          method: 'add',
          params: {
            id: 'mod',
            actionId: target.id,
            key: CResource.gold,
            amount: 2,
          },
        },
      ],
    });
    const grant = content.action({
      effects: [
        { type: 'building', method: 'add', params: { id: building.id } },
      ],
    });
    const ctx = createTestEngine(content);
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const before = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
    const cost = getActionCosts(grant.id, ctx, { id: building.id });
    ctx.activePlayer.gold = cost[CResource.gold] ?? 0;
    ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
    performAction(grant.id, ctx, { id: building.id });
    const after = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
    const bonus = building.onBuild?.find(
      (e) => e.type === 'cost_mod' && e.method === 'add',
    )?.params?.['amount'] as number;
    expect(ctx.activePlayer.buildings.has(building.id)).toBe(true);
    expect(after).toBe(before + bonus);
  });
});
