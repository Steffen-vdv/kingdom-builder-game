import { describe, it, expect } from 'vitest';
import {
  performAction,
  getActionCosts,
  collectTriggerEffects,
  runEffects,
  advance,
  type EngineContext,
} from '../../src';
import { createTestEngine } from '../helpers';
import {
  createActionRegistry,
  createBuildingRegistry,
  ACTIONS,
  BUILDINGS,
} from '@kingdom-builder/contents';

function clone<T>(v: T): T {
  return structuredClone(v);
}

const expandId = 'test_expand';
const tillId = 'test_till';
const plowId = 'test_plow';
const buildId = 'test_build';
const workshopId = 'test_workshop';

function setup() {
  const actions = createActionRegistry();
  const buildings = createBuildingRegistry();

  const expandDef = clone(ACTIONS.get('expand'));
  expandDef.id = expandId;
  actions.add(expandId, expandDef);

  const tillDef = clone(ACTIONS.get('till'));
  tillDef.id = tillId;
  actions.add(tillId, tillDef);

  const plowDef = clone(ACTIONS.get('plow'));
  plowDef.id = plowId;
  plowDef.effects = plowDef.effects.map((e) => {
    const params = { ...(e.params ?? {}) } as { id?: string };
    if (e.type === 'action' && e.method === 'perform') {
      if (params.id === 'expand') params.id = expandId;
      if (params.id === 'till') params.id = tillId;
    }
    return { ...e, params };
  });
  actions.add(plowId, plowDef);

  const buildDef = clone(ACTIONS.get('build'));
  buildDef.id = buildId;
  actions.add(buildId, buildDef);

  const workshopSrc = Array.from(BUILDINGS.map.values()).find((b) =>
    (b.onBuild || []).some(
      (e) => ((e.params ?? {}) as { id?: string }).id === 'plow',
    ),
  );
  if (!workshopSrc) throw new Error('workshop not found');
  const workshopDef = clone(workshopSrc);
  workshopDef.id = workshopId;
  workshopDef.onBuild = (workshopDef.onBuild || []).map((e) => {
    const params = { ...(e.params ?? {}) } as { id?: string };
    if (e.type === 'action' && e.method === 'add' && params.id === 'plow')
      params.id = plowId;
    return { ...e, params };
  });
  buildings.add(workshopId, workshopDef);

  const ctx = createTestEngine({ actions, buildings });
  while (ctx.game.currentPhase !== 'main') advance(ctx);
  return ctx;
}

function countTilled(ctx: EngineContext): number {
  return ctx.activePlayer.lands.filter((l) => l.tilled).length;
}

function getCostMod(ctx: EngineContext) {
  const plowDef = ctx.actions.get(plowId);
  const passive = plowDef.effects.find((e) => e.type === 'passive');
  const costMod = (passive?.effects || []).find(
    (e) => e.type === 'cost_mod' && e.method === 'add',
  );
  const key = ((costMod?.params ?? {}) as { key: string }).key;
  const amount = Number(
    ((costMod?.params ?? {}) as { amount?: number }).amount ?? 0,
  );
  return { key, amount };
}

describe('Plow action', () => {
  it('expands, tills and adds temporary cost modifier', () => {
    const ctx = setup();
    const baseCost = getActionCosts(expandId, ctx);
    const { key, amount } = getCostMod(ctx);
    const buildCost = getActionCosts(buildId, ctx, { id: workshopId });
    for (const k of Object.keys(buildCost)) {
      ctx.activePlayer.resources[k] = Math.max(
        ctx.activePlayer.resources[k] || 0,
        buildCost[k] || 0,
      );
    }
    performAction(buildId, ctx, { id: workshopId });
    const plowCost = getActionCosts(plowId, ctx);
    for (const k of Object.keys(plowCost)) {
      ctx.activePlayer.resources[k] = Math.max(
        ctx.activePlayer.resources[k] || 0,
        plowCost[k] || 0,
      );
    }
    const landsBefore = ctx.activePlayer.lands.length;
    const tilledBefore = countTilled(ctx);
    performAction(plowId, ctx);
    expect(ctx.activePlayer.lands.length).toBe(landsBefore + 1);
    expect(countTilled(ctx)).toBe(tilledBefore + 1);
    const modified = getActionCosts(expandId, ctx);
    expect(modified[key]).toBe((baseCost[key] || 0) + amount);
    runEffects(collectTriggerEffects('onUpkeepPhase', ctx), ctx);
    const reverted = getActionCosts(expandId, ctx);
    expect(reverted[key]).toBe(baseCost[key] || 0);
  });
});
