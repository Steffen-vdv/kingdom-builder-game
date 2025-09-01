import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts } from '@kingdom-builder/engine';
import {
  createTestContext,
  getActionOutcome,
  getBuildingWithActionMods,
  getBuildActionId,
} from './fixtures';

describe('Building placement integration', () => {
  it('applies building effects to subsequent actions', () => {
    const ctx = createTestContext();
    const { buildingId, actionId } = getBuildingWithActionMods();
    const buildActionId = getBuildActionId(ctx);
    const expandBefore = getActionOutcome(actionId, ctx);
    const buildCosts = getActionCosts(buildActionId, ctx, { id: buildingId });
    for (const [key, cost] of Object.entries(buildCosts)) {
      ctx.activePlayer.resources[key] =
        (ctx.activePlayer.resources[key] || 0) + (cost ?? 0);
    }
    const apKey = Object.keys(buildCosts)[0];
    ctx.activePlayer.resources[apKey] += expandBefore.costs[apKey] ?? 0;
    const resBefore = { ...ctx.activePlayer.resources };

    performAction(buildActionId, ctx, { id: buildingId });

    expect(ctx.activePlayer.buildings.has(buildingId)).toBe(true);
    for (const [key, cost] of Object.entries(buildCosts)) {
      expect(ctx.activePlayer.resources[key]).toBe(resBefore[key] - cost);
    }

    const expandAfter = getActionOutcome(actionId, ctx);
    expect(expandAfter).not.toEqual(expandBefore);

    const resPre = { ...ctx.activePlayer.resources };
    const statsPre = { ...ctx.activePlayer.stats };
    const landPre = ctx.activePlayer.lands.length;

    performAction(actionId, ctx);

    for (const [key, cost] of Object.entries(expandAfter.costs)) {
      const gain = expandAfter.results.resources[key] || 0;
      expect(ctx.activePlayer.resources[key]).toBe(resPre[key] - cost + gain);
    }
    for (const [key, gain] of Object.entries(expandAfter.results.resources)) {
      if (expandAfter.costs[key] === undefined) {
        expect(ctx.activePlayer.resources[key]).toBe(resPre[key] + gain);
      }
    }
    expect(ctx.activePlayer.lands.length).toBe(
      landPre + expandAfter.results.land,
    );
    for (const [key, gain] of Object.entries(expandAfter.results.stats)) {
      expect(ctx.activePlayer.stats[key]).toBe(statsPre[key] + gain);
    }
  });
});
