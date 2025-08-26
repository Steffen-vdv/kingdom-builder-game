import { describe, it, expect } from 'vitest';
import { createEngine, runDevelopment, performAction, R, EngineContext } from '../../src/engine';

function getActionCosts(id: string, ctx: EngineContext) {
  const def = ctx.actions.get(id);
  const baseCosts = { ...(def.baseCosts || {}) };
  if (baseCosts[R.ap] === undefined) baseCosts[R.ap] = ctx.services.rules.defaultActionAPCost;
  return ctx.passives.applyCostMods(def.id, baseCosts, ctx);
}

function getExpandExpectations(ctx: EngineContext) {
  const expandDef = ctx.actions.get('expand');
  const costs = getActionCosts('expand', ctx);
  const landGain = expandDef.effects
    .filter(e => e.type === 'add_land')
    .reduce((sum, e) => sum + (e.params?.count ?? 0), 0);
  const baseHappiness = expandDef.effects
    .filter(e => e.type === 'add_resource' && e.params?.key === R.happiness)
    .reduce((sum, e) => sum + (e.params?.amount ?? 0), 0);
  const dummyCtx = { me: { happiness: 0 } } as EngineContext;
  ctx.passives.runResultMods(expandDef.id, dummyCtx);
  const extraHappiness = dummyCtx.me.happiness;
  return { costs, landGain, happinessGain: baseHappiness + extraHappiness };
}

describe('Expand action', () => {
  it('costs gold and AP while granting land and happiness without Town Charter', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const goldBefore = ctx.me.gold;
    const apBefore = ctx.me.ap;
    const landsBefore = ctx.me.lands.length;
    const hapBefore = ctx.me.happiness;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    expect(ctx.me.gold).toBe(goldBefore - (expected.costs[R.gold] || 0));
    expect(ctx.me.ap).toBe(apBefore - (expected.costs[R.ap] || 0));
    expect(ctx.me.lands.length).toBe(landsBefore + expected.landGain);
    expect(ctx.me.happiness).toBe(hapBefore + expected.happinessGain);
  });

  it('includes Town Charter modifiers when present', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build_town_charter', ctx);
    ctx.me.ap += 1; // allow another action
    const goldBefore = ctx.me.gold;
    const apBefore = ctx.me.ap;
    const hapBefore = ctx.me.happiness;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    expect(ctx.me.gold).toBe(goldBefore - (expected.costs[R.gold] || 0));
    expect(ctx.me.ap).toBe(apBefore - (expected.costs[R.ap] || 0));
    expect(ctx.me.happiness).toBe(hapBefore + expected.happinessGain);
  });

  it('applies modifiers consistently across multiple expansions', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build_town_charter', ctx);
    ctx.me.ap += 2; // allow two expands
    ctx.me.gold += 10; // top-up to afford two expands
    const goldBefore = ctx.me.gold;
    const apBefore = ctx.me.ap;
    const hapBefore = ctx.me.happiness;
    const landsBefore = ctx.me.lands.length;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    performAction('expand', ctx);
    expect(ctx.me.gold).toBe(goldBefore - (expected.costs[R.gold] || 0) * 2);
    expect(ctx.me.ap).toBe(apBefore - (expected.costs[R.ap] || 0) * 2);
    expect(ctx.me.happiness).toBe(hapBefore + expected.happinessGain * 2);
    expect(ctx.me.lands.length).toBe(landsBefore + expected.landGain * 2);
  });

  it('rejects expand when gold is insufficient', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const cost = getActionCosts('expand', ctx);
    ctx.me.gold = (cost[R.gold] || 0) - 1;
    expect(() => performAction('expand', ctx)).toThrow(/Insufficient gold/);
  });
});
