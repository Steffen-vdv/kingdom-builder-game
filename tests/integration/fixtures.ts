import {
  createEngine,
  getActionCosts,
} from '../../packages/engine/src/index.ts';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
} from '../../packages/contents/src/index.ts';
import type {
  EngineContext,
  EffectDef,
} from '../../packages/engine/src/index.ts';
import { PlayerState, Land } from '../../packages/engine/src/state/index.ts';
import { runEffects } from '../../packages/engine/src/effects/index.ts';

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function clonePlayer(player: PlayerState) {
  const copy = new PlayerState(player.id, player.name);
  copy.resources = deepClone(player.resources);
  copy.stats = deepClone(player.stats);
  copy.population = deepClone(player.population);
  copy.lands = player.lands.map((landState) => {
    const newLand = new Land(landState.id, landState.slotsMax);
    newLand.slotsUsed = landState.slotsUsed;
    newLand.developments = [...landState.developments];
    return newLand;
  });
  copy.buildings = new Set([...player.buildings]);
  return copy;
}

export function createTestContext(overrides?: { gold?: number; ap?: number }) {
  const ctx = createEngine({
    actions: ACTIONS,
    buildings: BUILDINGS,
    developments: DEVELOPMENTS,
    populations: POPULATIONS,
    phases: PHASES,
    start: GAME_START,
  });
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
  const actionDefinition = ctx.actions.get(id);
  const costs = getActionCosts(id, ctx);
  const results = simulateEffects(
    actionDefinition.effects,
    ctx,
    actionDefinition.id,
  );
  return { costs, results };
}
