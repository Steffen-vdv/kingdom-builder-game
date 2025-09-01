import { describe, it, expect } from 'vitest';
import {
  performAction,
  getActionCosts,
  type EngineContext,
  advance,
} from '../../src';
import { createTestEngine } from '../helpers';
import { PlayerState, Resource as ctxResource } from '../../src/state';
import {
  createActionRegistry,
  createBuildingRegistry,
  ACTIONS,
  BUILDINGS,
} from '@kingdom-builder/contents';

function clone<T>(value: T): T {
  return structuredClone(value);
}

const expandId = 'test_expand';
const buildId = 'test_build';
const charterId = 'test_charter';

function setup() {
  const actions = createActionRegistry();
  const buildings = createBuildingRegistry();

  const expandDef = clone(ACTIONS.get('expand'));
  expandDef.id = expandId;
  actions.add(expandId, expandDef);

  const buildDef = clone(ACTIONS.get('build'));
  buildDef.id = buildId;
  actions.add(buildId, buildDef);

  const charterSrc = Array.from(BUILDINGS.map.values()).find((b) =>
    (b.onBuild || []).some(
      (e) => ((e.params ?? {}) as { actionId?: string }).actionId === 'expand',
    ),
  );
  if (!charterSrc) throw new Error('charter not found');
  const charterDef = clone(charterSrc);
  charterDef.id = charterId;
  charterDef.onBuild = (charterDef.onBuild || []).map((e) => {
    const params = { ...(e.params ?? {}) } as { actionId?: string };
    if (params.actionId === 'expand') params.actionId = expandId;
    return { ...e, params };
  });
  buildings.add(charterId, charterDef);

  const ctx = createTestEngine({ actions, buildings });
  while (ctx.game.currentPhase !== 'main') advance(ctx);
  return ctx;
}

function getExpandExpectations(ctx: EngineContext) {
  const expandDef = ctx.actions.get(expandId);
  const costs = getActionCosts(expandId, ctx);
  const landGain = expandDef.effects
    .filter((e) => e.type === 'land' && e.method === 'add')
    .reduce((sum, e) => sum + Number(e.params?.count ?? 0), 0);
  const resEffect = expandDef.effects.find(
    (e) => e.type === 'resource' && e.method === 'add',
  );
  const resKey = ((resEffect?.params ?? {}) as { key: string }).key;
  const baseRes = Number(
    ((resEffect?.params ?? {}) as { amount?: number }).amount ?? 0,
  );
  const dummy = new PlayerState(ctx.activePlayer.id, ctx.activePlayer.name);
  dummy.resources = clone(ctx.activePlayer.resources);
  dummy.stats = clone(ctx.activePlayer.stats);
  const dummyCtx = { ...ctx, activePlayer: dummy } as EngineContext;
  const before = dummy.resources[resKey] || 0;
  ctx.passives.runResultMods(expandDef.id, dummyCtx);
  const extra = (dummy.resources[resKey] || 0) - before;
  return { costs, landGain, resKey, resGain: baseRes + extra };
}

function payResourceKey(costs: Record<string, number>) {
  return Object.keys(costs).find((k) => k !== ctxResource.ap)!;
}

describe('Expand action', () => {
  it('costs resources and grants land and happiness', () => {
    const ctx = setup();
    const expected = getExpandExpectations(ctx);
    const payKey = payResourceKey(expected.costs);
    const apKey = apResourceKey();
    const goldBefore = ctx.activePlayer.resources[payKey] || 0;
    const apBefore = ctx.activePlayer.resources[apKey] || 0;
    const landsBefore = ctx.activePlayer.lands.length;
    const resBefore = ctx.activePlayer.resources[expected.resKey] || 0;
    performAction(expandId, ctx);
    expect(ctx.activePlayer.resources[payKey]).toBe(
      goldBefore - (expected.costs[payKey] || 0),
    );
    expect(ctx.activePlayer.resources[apKey]).toBe(
      apBefore - (expected.costs[apKey] || 0),
    );
    expect(ctx.activePlayer.lands.length).toBe(landsBefore + expected.landGain);
    expect(ctx.activePlayer.resources[expected.resKey]).toBe(
      resBefore + expected.resGain,
    );
  });

  it('includes charter modifiers when present', () => {
    const ctx = setup();
    const payKey = payResourceKey(getActionCosts(expandId, ctx));
    performAction(buildId, ctx, { id: charterId });
    ctx.activePlayer.resources[apResourceKey()] += 1;
    const expected = getExpandExpectations(ctx);
    const goldBefore = ctx.activePlayer.resources[payKey] || 0;
    const apBefore = ctx.activePlayer.resources[apResourceKey()] || 0;
    const resBefore = ctx.activePlayer.resources[expected.resKey] || 0;
    performAction(expandId, ctx);
    expect(ctx.activePlayer.resources[payKey]).toBe(
      goldBefore - (expected.costs[payKey] || 0),
    );
    expect(ctx.activePlayer.resources[apResourceKey()]).toBe(
      apBefore - (expected.costs[apResourceKey()] || 0),
    );
    expect(ctx.activePlayer.resources[expected.resKey]).toBe(
      resBefore + expected.resGain,
    );
  });

  it('applies modifiers across multiple expansions', () => {
    const ctx = setup();
    performAction(buildId, ctx, { id: charterId });
    ctx.activePlayer.resources[apResourceKey()] += 2;
    const payKey = payResourceKey(getActionCosts(expandId, ctx));
    ctx.activePlayer.resources[payKey] += 10;
    const expected = getExpandExpectations(ctx);
    const goldBefore = ctx.activePlayer.resources[payKey] || 0;
    const apBefore = ctx.activePlayer.resources[apResourceKey()] || 0;
    const resBefore = ctx.activePlayer.resources[expected.resKey] || 0;
    const landsBefore = ctx.activePlayer.lands.length;
    performAction(expandId, ctx);
    performAction(expandId, ctx);
    expect(ctx.activePlayer.resources[payKey]).toBe(
      goldBefore - (expected.costs[payKey] || 0) * 2,
    );
    expect(ctx.activePlayer.resources[apResourceKey()]).toBe(
      apBefore - (expected.costs[apResourceKey()] || 0) * 2,
    );
    expect(ctx.activePlayer.resources[expected.resKey]).toBe(
      resBefore + expected.resGain * 2,
    );
    expect(ctx.activePlayer.lands.length).toBe(
      landsBefore + expected.landGain * 2,
    );
  });

  it('rejects expand when resource is insufficient', () => {
    const ctx = setup();
    const costs = getActionCosts(expandId, ctx);
    const payKey = payResourceKey(costs);
    ctx.activePlayer.resources[payKey] = (costs[payKey] || 0) - 1;
    const need = costs[payKey];
    const have = ctx.activePlayer.resources[payKey];
    const expectedMsg = `Insufficient ${payKey}: need ${need}, have ${have}`;
    expect(() => performAction(expandId, ctx)).toThrow(expectedMsg);
  });
});

function apResourceKey() {
  return ctxResource.ap!;
}
