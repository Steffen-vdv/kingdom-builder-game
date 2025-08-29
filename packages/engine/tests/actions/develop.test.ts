import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  resolveAttack,
  runDevelopment,
  EngineContext,
  PassiveManager,
  getActionCosts,
  type ResourceKey,
} from '../../src/index.ts';
import { PlayerState, Land, GameState } from '../../src/state/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import { applyParamsToEffects } from '../../src/utils.ts';

function clonePlayer(player: PlayerState): PlayerState {
  const copy = new PlayerState(player.id, player.name);
  copy.resources = { ...player.resources };
  copy.stats = { ...player.stats };
  copy.population = { ...player.population };
  copy.lands = player.lands.map((landState) => {
    const land = new Land(landState.id, landState.slotsMax, landState.tilled);
    land.slotsUsed = landState.slotsUsed;
    land.developments = [...landState.developments];
    return land;
  });
  copy.buildings = new Set(player.buildings);
  return copy;
}

function simulateBuild(ctx: EngineContext, id: string, landId: string) {
  const developmentDefinition = ctx.developments.get(id);
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
  for (const [resourceKey, cost] of Object.entries(costs)) {
    sim.activePlayer.resources[resourceKey as ResourceKey] -= cost;
  }
  const land = sim.activePlayer.lands.find(
    (landState) => landState.id === landId,
  )!;
  land.developments.push(id);
  land.slotsUsed += 1;
  const effects = applyParamsToEffects(developmentDefinition.onBuild || [], {
    landId,
    id,
  });
  runEffects(effects, sim);
  return sim;
}

function expectState(actual: PlayerState, expected: PlayerState) {
  expect(actual.resources).toEqual(expected.resources);
  for (const [statKey, statValue] of Object.entries(expected.stats)) {
    expect(actual.stats[statKey as keyof typeof actual.stats]).toBeCloseTo(
      statValue,
      5,
    );
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

    const developmentDefinition = ctx.developments.get('watchtower');
    const removalEffects = applyParamsToEffects(
      developmentDefinition.onAttackResolved || [],
      {
        landId: land.id,
        id: 'watchtower',
      },
    );
    runEffects(removalEffects, buildSim);
    resolveAttack(ctx.activePlayer, 0, ctx);
    expectState(ctx.activePlayer, buildSim.activePlayer);
    const simLand = buildSim.activePlayer.lands.find(
      (landState) => landState.id === land.id,
    )!;
    expect(land.developments).toEqual(simLand.developments);
    expect(land.slotsUsed).toBe(simLand.slotsUsed);
    expect(ctx.activePlayer.fortificationStrength).toBe(
      expectedBuild.fortificationStrength,
    );
  });
});
