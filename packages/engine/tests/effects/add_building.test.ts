import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts } from '../../src/index.ts';
import {
  createActionRegistry,
  Resource as CResource,
  BUILDINGS,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import type { EngineContext } from '../../src/index.ts';

// Custom action that grants Town Charter for free to test the effect handler
const actions = createActionRegistry();
const [townCharterId] = Array.from(
  (BUILDINGS as unknown as { map: Map<string, unknown> }).map.keys(),
);
actions.add('free_charter', {
  id: 'free_charter',
  name: 'Free Charter',
  baseCosts: { [CResource.ap]: 0 },
  effects: [{ type: 'building', method: 'add', params: { id: townCharterId } }],
});

function getExpandGoldCost(ctx: EngineContext) {
  const costs = getActionCosts('expand', ctx);
  return costs[CResource.gold] || 0;
}

describe('building:add effect', () => {
  it('adds building and applies its passives', () => {
    const ctx = createTestEngine({ actions });
    ctx.activePlayer.ap =
      ctx.buildings.get(townCharterId).costs[CResource.ap] ?? 0;
    const before = getExpandGoldCost(ctx);
    performAction('free_charter', ctx);
    expect(ctx.activePlayer.buildings.has(townCharterId)).toBe(true);
    const after = getExpandGoldCost(ctx);
    expect(after).toBeGreaterThan(before);
  });
});
