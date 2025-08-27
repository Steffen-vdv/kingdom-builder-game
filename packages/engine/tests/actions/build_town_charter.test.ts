import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  Resource,
  EngineContext,
} from '../../src/index.ts';

function getActionCosts(id: string, ctx: EngineContext) {
  const def = ctx.actions.get(id);
  const baseCosts = { ...(def.baseCosts || {}) };
  if (baseCosts[Resource.ap] === undefined)
    baseCosts[Resource.ap] = ctx.services.rules.defaultActionAPCost;
  return ctx.passives.applyCostMods(def.id, baseCosts, ctx);
}

describe('Build Town Charter action', () => {
  it('rejects when gold is insufficient', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const cost = getActionCosts('build_town_charter', ctx);
    ctx.activePlayer.gold = (cost[Resource.gold] || 0) - 1;
    expect(() => performAction('build_town_charter', ctx)).toThrow(
      /Insufficient gold/,
    );
  });

  it('adds Town Charter and applies its passive to Expand', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const buildCost = getActionCosts('build_town_charter', ctx);
    const expandCostBefore = getActionCosts('expand', ctx);
    const goldBefore = ctx.activePlayer.gold;
    const apBefore = ctx.activePlayer.ap;
    performAction('build_town_charter', ctx);
    expect(ctx.activePlayer.buildings.has('town_charter')).toBe(true);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (buildCost[Resource.gold] || 0),
    );
    expect(ctx.activePlayer.ap).toBe(apBefore - (buildCost[Resource.ap] || 0));
    const expandCostAfter = getActionCosts('expand', ctx);
    expect(expandCostAfter[Resource.gold]).toBeGreaterThan(
      expandCostBefore[Resource.gold] || 0,
    );
  });
});
