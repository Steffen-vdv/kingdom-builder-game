import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, runEffects, advance } from '../../src';
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

const buildId = 'test_build';
const expandId = 'test_expand';
const charterId = 'test_charter';

function setup() {
  const actions = createActionRegistry();
  const buildings = createBuildingRegistry();

  const buildDef = clone(ACTIONS.get('build'));
  buildDef.id = buildId;
  actions.add(buildId, buildDef);

  const expandDef = clone(ACTIONS.get('expand'));
  expandDef.id = expandId;
  actions.add(expandId, expandDef);

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

describe('Build action', () => {
  it('rejects when resources are insufficient', () => {
    const ctx = setup();
    const cost = getActionCosts(buildId, ctx, { id: charterId });
    const payKey = Object.keys(cost).find((k) => k !== ctx.actionCostResource)!;
    ctx.activePlayer.resources[payKey] = (cost[payKey] || 0) - 1;
    const expected = `Insufficient ${payKey}: need ${cost[payKey]}, have ${ctx.activePlayer.resources[payKey]}`;
    expect(() => performAction(buildId, ctx, { id: charterId })).toThrow(
      expected,
    );
  });

  it('adds charter modifying expand until removed', () => {
    const ctx = setup();
    const baseCost = getActionCosts(expandId, ctx);
    performAction(buildId, ctx, { id: charterId });
    expect(ctx.activePlayer.buildings.has(charterId)).toBe(true);
    const modified = getActionCosts(expandId, ctx);
    expect(modified).not.toEqual(baseCost);
    runEffects(
      [{ type: 'building', method: 'remove', params: { id: charterId } }],
      ctx,
    );
    expect(ctx.activePlayer.buildings.has(charterId)).toBe(false);
    const reverted = getActionCosts(expandId, ctx);
    expect(reverted).toEqual(baseCost);
  });
});
