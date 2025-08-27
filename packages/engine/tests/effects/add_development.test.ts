import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  createActionRegistry,
  PassiveManager,
  getActionCosts,
  EngineContext,
} from '../../src/index.ts';
import { PlayerState, Land, GameState } from '../../src/state/index.ts';
import type { ResourceId } from '../../src/state/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import { applyParamsToEffects } from '../../src/utils.ts';

// Custom actions used to exercise the development:add handler
const actions = createActionRegistry();
// success case: build on empty land
actions.add('build_house', {
  id: 'build_house',
  name: 'Build House',
  baseCosts: { ap: 0 },
  effects: [
    {
      type: 'development',
      method: 'add',
      params: { id: 'house', landId: 'A-L2' },
    },
  ],
});
// error case: land does not exist
actions.add('build_house_bad_land', {
  id: 'build_house_bad_land',
  name: 'Build House Bad Land',
  baseCosts: { ap: 0 },
  effects: [
    {
      type: 'development',
      method: 'add',
      params: { id: 'house', landId: 'A-L9' },
    },
  ],
});
// error case: target land already full
actions.add('build_house_full', {
  id: 'build_house_full',
  name: 'Build House Full',
  baseCosts: { ap: 0 },
  effects: [
    {
      type: 'development',
      method: 'add',
      params: { id: 'house', landId: 'A-L1' },
    },
  ],
});

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
  const costs = getActionCosts('build_house', ctx);
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
  for (const [k, v] of Object.entries(costs) as [ResourceId, number][]) {
    sim.activePlayer.resources[k] -= v;
  }
  const land = sim.activePlayer.lands.find((l) => l.id === landId)!;
  land.developments.push(id);
  land.slotsUsed += 1;
  const effects = applyParamsToEffects(def.onBuild || [], { landId, id });
  runEffects(effects, sim);
  return sim;
}

describe('development:add effect', () => {
  it('adds house and applies onBuild effects', () => {
    const ctx = createEngine({ actions });
    const land = ctx.activePlayer.lands[1];
    const slotsBefore = land.slotsUsed;
    const expected = simulateBuild(ctx, 'house', land.id);
    performAction('build_house', ctx);
    expect(land.developments).toContain('house');
    expect(land.slotsUsed).toBe(slotsBefore + 1);
    expect(ctx.activePlayer.resources).toEqual(expected.activePlayer.resources);
    for (const [k, v] of Object.entries(expected.activePlayer.stats)) {
      expect(
        ctx.activePlayer.stats[k as keyof typeof ctx.activePlayer.stats],
      ).toBeCloseTo(v, 5);
    }
  });

  it('throws if land does not exist', () => {
    const ctx = createEngine({ actions });
    expect(() => performAction('build_house_bad_land', ctx)).toThrow(
      /Land A-L9 not found/,
    );
  });

  it('throws if land has no free slots', () => {
    const ctx = createEngine({ actions });
    expect(() => performAction('build_house_full', ctx)).toThrow(
      /No free slots on land A-L1/,
    );
  });
});
