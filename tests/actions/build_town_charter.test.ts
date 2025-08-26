import { describe, it, expect } from 'vitest';
import { createEngine, runDevelopment, performAction, R, EngineContext } from '../../src/engine';

function getActionCosts(id: string, ctx: EngineContext) {
  const def = ctx.actions.get(id);
  const baseCosts = { ...(def.baseCosts || {}) };
  if (baseCosts[R.ap] === undefined) baseCosts[R.ap] = ctx.services.rules.defaultActionAPCost;
  return ctx.passives.applyCostMods(def.id, baseCosts, ctx);
}

describe('Build Town Charter action', () => {
  it('rejects when gold is insufficient', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const cost = getActionCosts('build_town_charter', ctx);
    ctx.me.gold = (cost[R.gold] || 0) - 1;
    expect(() => performAction('build_town_charter', ctx)).toThrow(/Insufficient gold/);
  });
});
