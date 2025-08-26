import { describe, it, expect } from 'vitest';
import { createEngine, runDevelopment, performAction, R, EngineContext, createActionRegistry } from '../../src/engine';

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

describe('Action configuration overrides', () => {
  it('respects modified expand costs and effects', () => {
    const actions = createActionRegistry();
    const expand = actions.get('expand');
    expand.baseCosts = { [R.gold]: 3 };
    expand.effects = [
      { type: 'add_land', params: { count: 2 } },
      { type: 'add_resource', params: { key: R.happiness, amount: 5 } },
    ];
    const ctx = createEngine({ actions });
    runDevelopment(ctx);
    const goldBefore = ctx.me.gold;
    const landsBefore = ctx.me.lands.length;
    const hapBefore = ctx.me.happiness;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    expect(ctx.me.gold).toBe(goldBefore - (expected.costs[R.gold] || 0));
    expect(ctx.me.lands.length).toBe(landsBefore + expected.landGain);
    expect(ctx.me.happiness).toBe(hapBefore + expected.happinessGain);
  });
});
