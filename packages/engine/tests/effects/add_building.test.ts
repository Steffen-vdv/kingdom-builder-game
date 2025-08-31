import { describe, it, expect } from 'vitest';
import { performAction, Resource, getActionCosts } from '../../src/index.ts';
import { createActionRegistry } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import type { EngineContext } from '../../src/index.ts';

// Custom action that grants Town Charter for free to test the effect handler
const actions = createActionRegistry();
actions.add('free_charter', {
  id: 'free_charter',
  name: 'Free Charter',
  baseCosts: { [Resource.ap]: 0 },
  effects: [
    { type: 'building', method: 'add', params: { id: 'town_charter' } },
  ],
});

function getExpandGoldCost(ctx: EngineContext) {
  const costs = getActionCosts('expand', ctx);
  return costs[Resource.gold] || 0;
}

describe('building:add effect', () => {
  it('adds building and applies its passives', () => {
    const ctx = createTestEngine({ actions });
    ctx.activePlayer.ap =
      ctx.buildings.get('town_charter').costs[Resource.ap] ?? 0;
    const before = getExpandGoldCost(ctx);
    performAction('free_charter', ctx);
    expect(ctx.activePlayer.buildings.has('town_charter')).toBe(true);
    const after = getExpandGoldCost(ctx);
    expect(after).toBeGreaterThan(before);
  });
});
