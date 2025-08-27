import { describe, it, expect } from 'vitest';
import {
  performAction,
  Resource,
  getActionCosts,
  type ResourceKey,
} from '../../packages/engine/src/index.ts';
import { createTestContext } from './fixtures';

describe('Action edge cases', () => {
  it('throws for unknown action', () => {
    const ctx = createTestContext();
    expect(() => performAction('not_real', ctx)).toThrow(/Unknown id/);
  });

  it('rejects actions when a required resource is exhausted', () => {
    const ctx = createTestContext();
    const costs = getActionCosts('expand', ctx);
    const entries = Object.entries(costs).filter(
      ([k]) => k !== Resource.ap,
    ) as [ResourceKey, number][];
    if (entries.length === 0) return; // no non-AP cost to exhaust
    const [key, amount]: [ResourceKey, number] = entries[0];
    ctx.activePlayer.resources[key] = (amount ?? 0) - 1;
    expect(() => performAction('expand', ctx)).toThrow(
      new RegExp(`Insufficient ${key}`),
    );
    expect(ctx.activePlayer.resources[key]).toBe((amount ?? 0) - 1);
  });

  it('rejects actions when action points are exhausted', () => {
    const ctx = createTestContext();
    const cost = getActionCosts('expand', ctx);
    ctx.activePlayer.ap = (cost[Resource.ap] || 0) - 1;
    expect(() => performAction('expand', ctx)).toThrow(/Insufficient ap/);
    expect(ctx.activePlayer.ap).toBe((cost[Resource.ap] || 0) - 1);
  });
});
