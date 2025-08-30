import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  getActionCosts,
  Resource,
} from '../../src/index.ts';

describe('Till action', () => {
  it('tills an available land for free', () => {
    const ctx = createEngine();
    ctx.activePlayer.actions.add('till');
    ctx.activePlayer.ap = 5;
    const target = ctx.activePlayer.lands.find((l) => !l.tilled)!;
    const before = target.slotsMax;
    const costs = getActionCosts('till', ctx);
    performAction('till', ctx);
    expect(costs[Resource.ap]).toBe(0);
    expect(target.tilled).toBe(true);
    expect(target.slotsMax).toBe(
      Math.min(before + 1, ctx.services.rules.maxSlotsPerLand),
    );
    expect(ctx.activePlayer.ap).toBe(5);
  });

  it('throws when no tillable land exists', () => {
    const ctx = createEngine();
    ctx.activePlayer.actions.add('till');
    performAction('till', ctx);
    performAction('till', ctx);
    expect(() => performAction('till', ctx)).toThrow(/No tillable land/);
  });
});
