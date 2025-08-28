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

describe('Build Town Charter action', () => {
  it('rejects when gold is insufficient', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const cost = getActionCosts('build_town_charter', ctx);
    ctx.activePlayer.gold = (cost[Resource.gold] || 0) - 1;
    expect(() => performAction('build_town_charter', ctx)).toThrow(
      /Insufficient gold/,
    );
  });

  it('adds Town Charter and applies its passive to Expand', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const buildCost = getActionCosts('build_town_charter', ctx);

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
    for (const [k, v] of Object.entries(buildCost)) {
      sim.activePlayer.resources[k as ResourceKey] -= v;
    }
    const def = ctx.actions.get('build_town_charter');
    runEffects(applyParamsToEffects(def.effects, {}), sim);

    const expectedCost = getActionCosts('expand', sim);

    performAction('build_town_charter', ctx);
    expect(ctx.activePlayer.buildings.has('town_charter')).toBe(true);
    expect(ctx.activePlayer.gold).toBe(sim.activePlayer.gold);
    expect(ctx.activePlayer.ap).toBe(sim.activePlayer.ap);
    const expandCostAfter = getActionCosts('expand', ctx);
    expect(expandCostAfter).toEqual(expectedCost);
  });
});
