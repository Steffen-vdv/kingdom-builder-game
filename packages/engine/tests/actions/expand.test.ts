import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  Resource,
  EngineContext,
  getActionCosts,
} from '../../src/index.ts';

function getExpandExpectations(ctx: EngineContext) {
  const expandDef = ctx.actions.get('expand');
  const costs = getActionCosts('expand', ctx);
  const landGain = expandDef.effects
    .filter((e) => e.type === 'land' && e.method === 'add')
    .reduce((sum, e) => sum + (e.params?.count ?? 0), 0);
  const baseHappiness = expandDef.effects
    .filter(
      (e) =>
        e.type === 'resource' &&
        e.method === 'add' &&
        e.params?.key === Resource.happiness,
    )
    .reduce((sum, e) => sum + (e.params?.amount ?? 0), 0);
  const dummyCtx = { activePlayer: { happiness: 0 } } as EngineContext;
  ctx.passives.runResultMods(expandDef.id, dummyCtx);
  const extraHappiness = dummyCtx.activePlayer.happiness;
  return { costs, landGain, happinessGain: baseHappiness + extraHappiness };
}

describe('Expand action', () => {
  it('costs gold and AP while granting land and happiness without Town Charter', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const goldBefore = ctx.activePlayer.gold;
    const apBefore = ctx.activePlayer.ap;
    const landsBefore = ctx.activePlayer.lands.length;
    const hapBefore = ctx.activePlayer.happiness;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (expected.costs[Resource.gold] || 0),
    );
    expect(ctx.activePlayer.ap).toBe(
      apBefore - (expected.costs[Resource.ap] || 0),
    );
    expect(ctx.activePlayer.lands.length).toBe(landsBefore + expected.landGain);
    expect(ctx.activePlayer.happiness).toBe(hapBefore + expected.happinessGain);
  });

  it('includes Town Charter modifiers when present', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build_town_charter', ctx);
    ctx.activePlayer.ap += 1; // allow another action
    const goldBefore = ctx.activePlayer.gold;
    const apBefore = ctx.activePlayer.ap;
    const hapBefore = ctx.activePlayer.happiness;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (expected.costs[Resource.gold] || 0),
    );
    expect(ctx.activePlayer.ap).toBe(
      apBefore - (expected.costs[Resource.ap] || 0),
    );
    expect(ctx.activePlayer.happiness).toBe(hapBefore + expected.happinessGain);
  });

  it('applies modifiers consistently across multiple expansions', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build_town_charter', ctx);
    ctx.activePlayer.ap += 2; // allow two expands
    ctx.activePlayer.gold += 10; // top-up to afford two expands
    const goldBefore = ctx.activePlayer.gold;
    const apBefore = ctx.activePlayer.ap;
    const hapBefore = ctx.activePlayer.happiness;
    const landsBefore = ctx.activePlayer.lands.length;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (expected.costs[Resource.gold] || 0) * 2,
    );
    expect(ctx.activePlayer.ap).toBe(
      apBefore - (expected.costs[Resource.ap] || 0) * 2,
    );
    expect(ctx.activePlayer.happiness).toBe(
      hapBefore + expected.happinessGain * 2,
    );
    expect(ctx.activePlayer.lands.length).toBe(
      landsBefore + expected.landGain * 2,
    );
  });

  it('rejects expand when gold is insufficient', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const cost = getActionCosts('expand', ctx);
    ctx.activePlayer.gold = (cost[Resource.gold] || 0) - 1;
    expect(() => performAction('expand', ctx)).toThrow(/Insufficient gold/);
  });
});
