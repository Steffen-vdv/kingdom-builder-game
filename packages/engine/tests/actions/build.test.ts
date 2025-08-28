import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  Resource,
  getActionCosts,
  EngineContext,
  PassiveManager,
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
    const land = new Land(landState.id, landState.slotsMax);
    land.slotsUsed = landState.slotsUsed;
    land.developments = [...landState.developments];
    return land;
  });
  copy.buildings = new Set(player.buildings);
  return copy;
}

describe('Build action', () => {
  it('rejects when gold is insufficient', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const cost = getActionCosts('build', ctx, { id: 'town_charter' });
    ctx.activePlayer.gold = (cost[Resource.gold] || 0) - 1;
    expect(() => performAction('build', ctx, { id: 'town_charter' })).toThrow(
      /Insufficient gold/,
    );
  });

  it('adds Town Charter and applies its passive to Expand', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const buildCost = getActionCosts('build', ctx, { id: 'town_charter' });

    const game = new GameState();
    game.players[0] = clonePlayer(ctx.activePlayer);
    game.players[1] = clonePlayer(ctx.opponent);
    const sim = new EngineContext(
      game,
      ctx.services,
      ctx.actions,
      ctx.buildings,
      ctx.developments,
      ctx.populations,
      new PassiveManager(),
    );
    for (const [resourceKey, cost] of Object.entries(buildCost)) {
      sim.activePlayer.resources[resourceKey as ResourceKey] -= cost;
    }
    const actionDefinition = ctx.actions.get('build');
    runEffects(
      applyParamsToEffects(actionDefinition.effects, { id: 'town_charter' }),
      sim,
    );

    const expectedCost = getActionCosts('expand', sim);

    performAction('build', ctx, { id: 'town_charter' });
    expect(ctx.activePlayer.buildings.has('town_charter')).toBe(true);
    expect(ctx.activePlayer.gold).toBe(sim.activePlayer.gold);
    expect(ctx.activePlayer.ap).toBe(sim.activePlayer.ap);
    const expandCostAfter = getActionCosts('expand', ctx);
    expect(expandCostAfter).toEqual(expectedCost);
  });
});
