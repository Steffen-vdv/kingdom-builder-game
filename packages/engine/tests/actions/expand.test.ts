import { describe, it, expect } from 'vitest';
import {
  performAction,
  Resource,
  getActionCosts,
  type EngineContext,
  advance,
} from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { PlayerState } from '../../src/state/index.ts';

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

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
  const dummy = new PlayerState(ctx.activePlayer.id, ctx.activePlayer.name);
  dummy.resources = deepClone(ctx.activePlayer.resources);
  dummy.stats = deepClone(ctx.activePlayer.stats);
  const dummyCtx = { ...ctx, activePlayer: dummy } as EngineContext;
  const happinessBefore = dummy.happiness;
  ctx.passives.runResultMods(expandDef.id, dummyCtx);
  const extraHappiness = dummy.happiness - happinessBefore;
  return { costs, landGain, happinessGain: baseHappiness + extraHappiness };
}

describe('Expand action', () => {
  it('costs gold and AP while granting land and happiness without Town Charter', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const goldBefore = ctx.activePlayer.gold;
    const actionPointsBefore = ctx.activePlayer.ap;
    const landsBefore = ctx.activePlayer.lands.length;
    const happinessBefore = ctx.activePlayer.happiness;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (expected.costs[Resource.gold] || 0),
    );
    expect(ctx.activePlayer.ap).toBe(
      actionPointsBefore - (expected.costs[Resource.ap] || 0),
    );
    expect(ctx.activePlayer.lands.length).toBe(landsBefore + expected.landGain);
    expect(ctx.activePlayer.happiness).toBe(
      happinessBefore + expected.happinessGain,
    );
  });

  it('includes Town Charter modifiers when present', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    performAction('build', ctx, { id: 'town_charter' });
    ctx.activePlayer.ap += 1; // allow another action
    const goldBefore = ctx.activePlayer.gold;
    const actionPointsBefore = ctx.activePlayer.ap;
    const happinessBefore = ctx.activePlayer.happiness;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (expected.costs[Resource.gold] || 0),
    );
    expect(ctx.activePlayer.ap).toBe(
      actionPointsBefore - (expected.costs[Resource.ap] || 0),
    );
    expect(ctx.activePlayer.happiness).toBe(
      happinessBefore + expected.happinessGain,
    );
  });

  it('applies modifiers consistently across multiple expansions', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    performAction('build', ctx, { id: 'town_charter' });
    ctx.activePlayer.ap += 2; // allow two expands
    ctx.activePlayer.gold += 10; // top-up to afford two expands
    const goldBefore = ctx.activePlayer.gold;
    const actionPointsBefore = ctx.activePlayer.ap;
    const happinessBefore = ctx.activePlayer.happiness;
    const landsBefore = ctx.activePlayer.lands.length;
    const expected = getExpandExpectations(ctx);
    performAction('expand', ctx);
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (expected.costs[Resource.gold] || 0) * 2,
    );
    expect(ctx.activePlayer.ap).toBe(
      actionPointsBefore - (expected.costs[Resource.ap] || 0) * 2,
    );
    expect(ctx.activePlayer.happiness).toBe(
      happinessBefore + expected.happinessGain * 2,
    );
    expect(ctx.activePlayer.lands.length).toBe(
      landsBefore + expected.landGain * 2,
    );
  });

  it('rejects expand when gold is insufficient', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const cost = getActionCosts('expand', ctx);
    ctx.activePlayer.gold = (cost[Resource.gold] || 0) - 1;
    expect(() => performAction('expand', ctx)).toThrow(/Insufficient gold/);
  });
});
