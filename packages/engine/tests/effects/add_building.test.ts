import { describe, it, expect } from 'vitest';
import { createEngine, performAction, createActionRegistry, Resource } from '../../src/index.ts';

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

function getExpandGoldCost(ctx: ReturnType<typeof createEngine>) {
  const def = ctx.actions.get('expand');
  const baseCosts = { ...(def.baseCosts || {}) };
  if (baseCosts[Resource.ap] === undefined) {
    baseCosts[Resource.ap] = ctx.services.rules.defaultActionAPCost;
  }
  const costs = ctx.passives.applyCostMods(def.id, baseCosts, ctx);
  return costs[Resource.gold] || 0;
}

describe('building:add effect', () => {
  it('adds building and applies its passives', () => {
    const ctx = createEngine({ actions });
    const before = getExpandGoldCost(ctx);
    performAction('free_charter', ctx);
    expect(ctx.activePlayer.buildings.has('town_charter')).toBe(true);
    const after = getExpandGoldCost(ctx);
    expect(after).toBe(before + 2);
  });
});

