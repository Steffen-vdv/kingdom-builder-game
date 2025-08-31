import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts } from '@kingdom-builder/engine';
import { createTestContext, getActionOutcome } from './fixtures';

describe('Building placement integration', () => {
  it('applies building effects to subsequent actions', () => {
    const ctx = createTestContext();
    ctx.activePlayer.ap = ctx.services.rules.defaultActionAPCost * 2;
    const expandBefore = getActionOutcome('expand', ctx);
    const buildCosts = getActionCosts('build', ctx, { id: 'town_charter' });
    const resBefore = { ...ctx.activePlayer.resources };

    performAction('build', ctx, { id: 'town_charter' });

    expect(ctx.activePlayer.buildings.has('town_charter')).toBe(true);
    for (const [key, cost] of Object.entries(buildCosts)) {
      expect(ctx.activePlayer.resources[key]).toBe(resBefore[key] - cost);
    }

    const expandAfter = getActionOutcome('expand', ctx);
    expect(expandAfter).not.toEqual(expandBefore);

    const resPre = { ...ctx.activePlayer.resources };
    const statsPre = { ...ctx.activePlayer.stats };
    const landPre = ctx.activePlayer.lands.length;

    performAction('expand', ctx);

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
