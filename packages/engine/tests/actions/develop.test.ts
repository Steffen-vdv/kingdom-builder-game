import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  resolveAttack,
  runDevelopment,
  EngineContext,
  PassiveManager,
  getActionCosts,
  Resource,
} from '../../src/index.ts';
import { PlayerState, Land, GameState } from '../../src/state/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import { applyParamsToEffects } from '../../src/utils.ts';

function clonePlayer(p: PlayerState): PlayerState {
  const copy = new PlayerState(p.id, p.name);
  copy.resources = { ...p.resources };
  copy.stats = { ...p.stats };
  copy.population = { ...p.population };
  copy.lands = p.lands.map((l) => {
    const land = new Land(l.id, l.slotsMax);
    land.slotsUsed = l.slotsUsed;
    land.developments = [...l.developments];
    return land;
  });
  copy.buildings = new Set(p.buildings);
  return copy;
}

function simulateBuild(ctx: EngineContext, id: string, landId: string) {
  const def = ctx.developments.get(id);
  const costs = getActionCosts('develop', ctx);
  const game = new GameState();
  game.players[0] = clonePlayer(ctx.activePlayer);
  game.players[1] = clonePlayer(ctx.opponent);
  game.currentPlayerIndex = 0;
  const sim = new EngineContext(
    game,
    ctx.services,
    ctx.actions,
    ctx.buildings,
    ctx.developments,
    ctx.populations,
    new PassiveManager(),
  );
  for (const [k, v] of Object.entries(costs)) {
    sim.activePlayer.resources[k as Resource] -= v as number;
  }
  const land = sim.activePlayer.lands.find((l) => l.id === landId)!;
  land.developments.push(id);
  land.slotsUsed += 1;
  const effects = applyParamsToEffects(def.onBuild || [], { landId, id });
  runEffects(effects, sim);
  return sim;
}

function expectState(actual: PlayerState, expected: PlayerState) {
  expect(actual.resources).toEqual(expected.resources);
  for (const [k, v] of Object.entries(expected.stats)) {
    expect(actual.stats[k as keyof typeof actual.stats]).toBeCloseTo(v, 5);
  }
}

describe('Develop action', () => {
  it('places a Farm applying its configured effects', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const land = ctx.activePlayer.lands[1];
    const slotsBefore = land.slotsUsed;
    const expected = simulateBuild(ctx, 'farm', land.id);
    performAction('develop', ctx, { id: 'farm', landId: land.id });
    expect(land.developments).toContain('farm');
    expect(land.slotsUsed).toBe(slotsBefore + 1);
    expectState(ctx.activePlayer, expected.activePlayer);
  });

  it('places a House applying its configured effects', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const land = ctx.activePlayer.lands[1];
    const slotsBefore = land.slotsUsed;
    const expected = simulateBuild(ctx, 'house', land.id);
    performAction('develop', ctx, { id: 'house', landId: land.id });
    expect(land.developments).toContain('house');
    expect(land.slotsUsed).toBe(slotsBefore + 1);
    expectState(ctx.activePlayer, expected.activePlayer);
  });

  it('places an Outpost applying its configured effects', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const land = ctx.activePlayer.lands[1];
    const slotsBefore = land.slotsUsed;
    const expected = simulateBuild(ctx, 'outpost', land.id);
    performAction('develop', ctx, { id: 'outpost', landId: land.id });
    expect(land.developments).toContain('outpost');
    expect(land.slotsUsed).toBe(slotsBefore + 1);
    expectState(ctx.activePlayer, expected.activePlayer);
  });

  it('handles Watchtower effects and cleanup after attack', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const land = ctx.activePlayer.lands[1];
    const slotsBefore = land.slotsUsed;
    const buildSim = simulateBuild(ctx, 'watchtower', land.id);
    const expectedBuild = clonePlayer(buildSim.activePlayer);
    performAction('develop', ctx, { id: 'watchtower', landId: land.id });
    expect(land.developments).toContain('watchtower');
    expect(land.slotsUsed).toBe(slotsBefore + 1);
    expectState(ctx.activePlayer, expectedBuild);

    const def = ctx.developments.get('watchtower');
    const removalEffects = applyParamsToEffects(def.onAttackResolved || [], {
      landId: land.id,
      id: 'watchtower',
    });
    runEffects(removalEffects, buildSim);
    resolveAttack(ctx.activePlayer, 0, ctx);
    expectState(ctx.activePlayer, buildSim.activePlayer);
    const simLand = buildSim.activePlayer.lands.find((l) => l.id === land.id)!;
    expect(land.developments).toEqual(simLand.developments);
    expect(land.slotsUsed).toBe(simLand.slotsUsed);
    expect(ctx.activePlayer.fortificationStrength).toBe(
      expectedBuild.fortificationStrength,
    );
  });
});
