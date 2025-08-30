import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  resolveAttack,
  EngineContext,
  PassiveManager,
  getActionCosts,
  type ResourceKey,
  advance,
  runEffects,
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
  sim.passives.addPassive({ id: `${id}_${landId}`, effects }, sim);
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
    while (ctx.game.currentPhase !== 'main') advance(ctx);
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
    while (ctx.game.currentPhase !== 'main') advance(ctx);
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
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const land = ctx.activePlayer.lands[1];
    const slotsBefore = land.slotsUsed;
    const expected = simulateBuild(ctx, 'outpost', land.id);
    performAction('develop', ctx, { id: 'outpost', landId: land.id });
    expect(land.developments).toContain('outpost');
    expect(land.slotsUsed).toBe(slotsBefore + 1);
    expectState(ctx.activePlayer, expected.activePlayer);
  });

  it('applies development effects and cleans up after attack', () => {
    const ctx = createEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const land = ctx.activePlayer.lands[1];

    const expectedBuild = simulateBuild(ctx, 'watchtower', land.id);
    const expectedAfterAttack = simulateBuild(ctx, 'watchtower', land.id);
    resolveAttack(expectedAfterAttack.activePlayer, 0, expectedAfterAttack);

    performAction('develop', ctx, { id: 'watchtower', landId: land.id });
    expect(land.developments).toContain('watchtower');
    expectState(ctx.activePlayer, expectedBuild.activePlayer);

    resolveAttack(ctx.activePlayer, 0, ctx);
    expect(land.developments).not.toContain('watchtower');
    expectState(ctx.activePlayer, expectedAfterAttack.activePlayer);
  });

  it('removing a development reverts its on-build effects', () => {
    const ctx = createEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const land = ctx.activePlayer.lands[1];

    const def = ctx.developments.get('house');
    const statEffect = def.onBuild.find((e) => e.type === 'stat') as {
      params: { amount: number };
    };
    const amount = statEffect.params.amount;

    const before = ctx.activePlayer.stats.maxPopulation;
    performAction('develop', ctx, { id: 'house', landId: land.id });
    expect(ctx.activePlayer.stats.maxPopulation).toBe(before + amount);

    runEffects(
      [
        {
          type: 'development',
          method: 'remove',
          params: { id: 'house', landId: land.id },
        },
      ],
      ctx,
    );
    expect(ctx.activePlayer.stats.maxPopulation).toBe(before);
    expect(land.developments).not.toContain('house');
  });
});
