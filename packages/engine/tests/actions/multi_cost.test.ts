import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  getActionCosts,
  Resource,
  advance,
} from '../../src/index.ts';
import { action, building } from '../../src/config/builders.ts';

describe('multi-cost content', () => {
  it('supports actions with multiple costs', () => {
    const multiCostAction = action('multi_cost_action', 'Multi Cost Action')
      .cost(Resource.gold, 3)
      .cost(Resource.happiness, 2)
      .effect({
        type: 'resource',
        method: 'add',
        params: { key: Resource.gold, amount: 0 },
      })
      .build();

    const ctx = createEngine({ config: { actions: [multiCostAction] } });
    while (ctx.game.currentPhase !== 'main') advance(ctx);

    ctx.activePlayer.gold = 5;
    ctx.activePlayer.happiness = 3;

    const costs = getActionCosts('multi_cost_action', ctx);
    performAction('multi_cost_action', ctx);

    expect(ctx.activePlayer.gold).toBe(5 - (costs[Resource.gold] || 0));
    expect(ctx.activePlayer.happiness).toBe(
      3 - (costs[Resource.happiness] || 0),
    );
  });

  it('supports building actions with multiple costs', () => {
    const multiCostBuildingDefinition = building(
      'multi_cost_building',
      'Multi Cost Building',
    )
      .cost(Resource.gold, 4)
      .cost(Resource.happiness, 1)
      .build();

    const buildAction = action(
      'build_multi_cost_building',
      'Build Multi Cost Building',
    )
      .cost(Resource.gold, 4)
      .cost(Resource.happiness, 1)
      .effect({
        type: 'building',
        method: 'add',
        params: { id: 'multi_cost_building' },
      })
      .build();

    const ctx = createEngine({
      config: {
        actions: [buildAction],
        buildings: [multiCostBuildingDefinition],
      },
    });
    while (ctx.game.currentPhase !== 'main') advance(ctx);

    ctx.activePlayer.gold = 10;
    ctx.activePlayer.happiness = 2;

    const costs = getActionCosts('build_multi_cost_building', ctx);
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
