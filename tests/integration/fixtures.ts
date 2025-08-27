import {
  createEngine,
  getActionCosts,
} from '../../packages/engine/src/index.ts';
import type {
  EngineContext,
  EffectDef,
} from '../../packages/engine/src/index.ts';
import { PlayerState, Land } from '../../packages/engine/src/state/index.ts';
import { runEffects } from '../../packages/engine/src/effects/index.ts';

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function clonePlayer(p: PlayerState) {
  const c = new PlayerState(p.id, p.name);
  c.resources = deepClone(p.resources);
  c.stats = deepClone(p.stats);
  c.population = deepClone(p.population);
  c.lands = p.lands.map((l) => {
    const nl = new Land(l.id, l.slotsMax);
    nl.slotsUsed = l.slotsUsed;
    nl.developments = [...l.developments];
    return nl;
  });
  c.buildings = new Set([...p.buildings]);
  return c;
}

export function createTestContext(overrides?: { gold?: number; ap?: number }) {
  const ctx = createEngine();
  if (overrides?.gold !== undefined) ctx.activePlayer.gold = overrides.gold;
  if (overrides?.ap !== undefined) ctx.activePlayer.ap = overrides.ap;
  return ctx;
}

export function simulateEffects(
  effects: EffectDef[],
  ctx: EngineContext,
  actionId?: string,
) {
  const before = clonePlayer(ctx.activePlayer);
  const dummy = clonePlayer(ctx.activePlayer);
  const dummyCtx = { ...ctx, activePlayer: dummy } as EngineContext;
  runEffects(effects, dummyCtx);
  if (actionId) ctx.passives.runResultMods(actionId, dummyCtx);

  const resources: Record<string, number> = {};
  for (const key of Object.keys(before.resources)) {
    const delta =
      dummy.resources[key as keyof typeof dummy.resources] -
      before.resources[key as keyof typeof before.resources];
    if (delta !== 0) resources[key] = delta;
  }

  const stats: Record<string, number> = {};
  for (const key of Object.keys(before.stats)) {
    const delta =
      dummy.stats[key as keyof typeof dummy.stats] -
      before.stats[key as keyof typeof before.stats];
    if (delta !== 0) stats[key] = delta;
  }

  const land = dummy.lands.length - before.lands.length;
  return { resources, stats, land };
}

export function getActionOutcome(id: string, ctx: EngineContext) {
  const def = ctx.actions.get(id);
  const costs = getActionCosts(id, ctx);
  const results = simulateEffects(def.effects, ctx, def.id);
  return { costs, results };
}
