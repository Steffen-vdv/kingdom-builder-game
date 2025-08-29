import { describe, it, expect } from 'vitest';
import {
  createEngine,
  getActionCosts,
  performAction,
  runDevelopment,
  Resource,
} from '../../src/index.ts';
import { createBuildingRegistry } from '../../src/content/buildings.ts';
import { building } from '../../src/config/builders.ts';

describe('opponent targeted building effects', () => {
  it('increases opponent build costs', () => {
    const buildings = createBuildingRegistry();
    buildings.add(
      'surcharge_tower',
      building('surcharge_tower', 'Surcharge Tower')
        .onBuild({
          type: 'passive',
          method: 'add',
          params: { id: 'surcharge_tower' },
          effects: [
            {
              type: 'cost_mod',
              method: 'add',
              params: {
                id: 'surcharge_build',
                actionId: 'build',
                key: Resource.gold,
                amount: 1,
                player: 'opponent',
              },
            },
          ],
        })
        .build(),
    );

    const ctx = createEngine({ buildings });
    runDevelopment(ctx);
    performAction('build', ctx, { id: 'surcharge_tower' });

    const millCost = ctx.buildings.get('mill').costs[Resource.gold] || 0;

    let costs = getActionCosts('build', ctx, { id: 'mill' });
    expect(costs[Resource.gold]).toBe(millCost);

    ctx.game.currentPlayerIndex = 1; // switch to opponent
    costs = getActionCosts('build', ctx, { id: 'mill' });
    expect(costs[Resource.gold]).toBe(millCost + 1);
  });
});
