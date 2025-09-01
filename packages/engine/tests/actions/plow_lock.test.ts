import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src';
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

describe('Plow action lock', () => {
  it('is locked until workshop is built', () => {
    const ctx = setup();
    expect(() => performAction(plowId, ctx)).toThrow(
      `Action ${plowId} is locked`,
    );
    const buildCost = getActionCosts(buildId, ctx, { id: workshopId });
    for (const key of Object.keys(buildCost)) {
      ctx.activePlayer.resources[key] = Math.max(
        ctx.activePlayer.resources[key] || 0,
        buildCost[key] || 0,
      );
    }
    performAction(buildId, ctx, { id: workshopId });
    const plowCost = getActionCosts(plowId, ctx);
    for (const key of Object.keys(plowCost)) {
      ctx.activePlayer.resources[key] = Math.max(
        ctx.activePlayer.resources[key] || 0,
        plowCost[key] || 0,
      );
    }
    expect(ctx.activePlayer.actions.has(plowId)).toBe(true);
    expect(() => performAction(plowId, ctx)).not.toThrow();
  });
});
