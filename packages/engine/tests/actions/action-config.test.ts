import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  Resource,
  createActionRegistry,
  getActionCosts,
  type EngineContext,
} from '../../src/index.ts';

function getExpandExpectations(ctx: EngineContext) {
  const expandDef = ctx.actions.get('expand');
  const costs = getActionCosts('expand', ctx);
  const landGain = expandDef.effects
    .filter((effect) => effect.type === 'land' && effect.method === 'add')
    .reduce((sum, effect) => sum + Number(effect.params?.count ?? 0), 0);
  const baseHappiness = expandDef.effects
    .filter(
      (effect) =>
        effect.type === 'resource' &&
        effect.method === 'add' &&
        effect.params?.key === Resource.happiness,
    )
    .reduce((sum, effect) => sum + Number(effect.params?.amount ?? 0), 0);
  const dummyCtx = { activePlayer: { happiness: 0 } } as EngineContext;
  ctx.passives.runResultMods(expandDef.id, dummyCtx);
  const extraHappiness = dummyCtx.activePlayer.happiness;
  return { costs, landGain, happinessGain: baseHappiness + extraHappiness };
}

describe('Action configuration overrides', () => {
  it('respects modified expand costs and effects', () => {
    const actions = createActionRegistry();
    const expand = actions.get('expand');
    expand.baseCosts = { [Resource.gold]: 3 };
    expand.effects = [
      { type: 'land', method: 'add', params: { count: 2 } },
      {
        type: 'resource',
        method: 'add',
        params: { key: Resource.happiness, amount: 5 },
      },
    ];
    const ctx = createEngine({ actions });
    runDevelopment(ctx);
    const goldBefore = ctx.activePlayer.gold;
    const landsBefore = ctx.activePlayer.lands.length;
    const hapBefore = ctx.activePlayer.happiness;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (expected.costs[Resource.gold] || 0),
    );
    expect(ctx.activePlayer.lands.length).toBe(landsBefore + expected.landGain);
    expect(ctx.activePlayer.happiness).toBe(hapBefore + expected.happinessGain);
  });
});
