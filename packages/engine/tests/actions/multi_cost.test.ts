import { describe, it, expect } from 'vitest';
import {
  performAction,
  getActionCosts,
  Resource,
  advance,
} from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { action, building } from '@kingdom-builder/contents/config/builders';
import { Resource as CResource } from '@kingdom-builder/contents';

describe('multi-cost content', () => {
  it('supports actions with multiple costs', () => {
    const multiCostAction = action()
      .id('multi_cost_action')
      .name('Multi Cost Action')
      .cost(CResource.gold, 3)
      .cost(CResource.happiness, 2)
      .effect({
        type: 'resource',
        method: 'add',
        params: { key: CResource.gold, amount: 0 },
      })
      .build();

    const ctx = createTestEngine({ config: { actions: [multiCostAction] } });
    while (ctx.game.currentPhase !== 'main') advance(ctx);

    ctx.activePlayer.gold = 5;
    ctx.activePlayer.happiness = 3;

    const costs = getActionCosts('multi_cost_action', ctx);
    ctx.activePlayer.ap = costs[Resource.ap] || 0;
    performAction('multi_cost_action', ctx);

    expect(ctx.activePlayer.gold).toBe(5 - (costs[Resource.gold] || 0));
    expect(ctx.activePlayer.happiness).toBe(
      3 - (costs[Resource.happiness] || 0),
    );
  });

  it('supports building actions with multiple costs', () => {
    const multiCostBuildingDefinition = building()
      .id('multi_cost_building')
      .name('Multi Cost Building')
      .cost(CResource.gold, 4)
      .cost(CResource.happiness, 1)
      .build();

    const buildAction = action()
      .id('build_multi_cost_building')
      .name('Build Multi Cost Building')
      .cost(CResource.gold, 4)
      .cost(CResource.happiness, 1)
      .effect({
        type: 'building',
        method: 'add',
        params: { id: 'multi_cost_building' },
      })
      .build();

    const ctx = createTestEngine({
      config: {
        actions: [buildAction],
        buildings: [multiCostBuildingDefinition],
      },
    });
    while (ctx.game.currentPhase !== 'main') advance(ctx);

    ctx.activePlayer.gold = 10;
    ctx.activePlayer.happiness = 2;

    const costs = getActionCosts('build_multi_cost_building', ctx);
    ctx.activePlayer.ap = costs[Resource.ap] || 0;
    performAction('build_multi_cost_building', ctx);

    expect(ctx.activePlayer.gold).toBe(10 - (costs[Resource.gold] || 0));
    expect(ctx.activePlayer.happiness).toBe(
      2 - (costs[Resource.happiness] || 0),
    );
    expect(ctx.activePlayer.buildings.has('multi_cost_building')).toBe(true);
    const buildingDefinition = ctx.buildings.get('multi_cost_building');
    expect(buildingDefinition.costs[Resource.gold]).toBe(4);
    expect(buildingDefinition.costs[Resource.happiness]).toBe(1);
  });
});
