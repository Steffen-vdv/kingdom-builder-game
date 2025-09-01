import { describe, it, expect } from 'vitest';
import {
  performAction,
  EngineContext,
  PassiveManager,
  getActionCosts,
  type ResourceKey,
} from '../../src/index.ts';
import {
  createActionRegistry,
  Resource as CResource,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import { PlayerState, Land, GameState } from '../../src/state/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import { applyParamsToEffects } from '../../src/utils.ts';

// Custom actions used to exercise the development:add handler
const actions = createActionRegistry();
// success case: build on empty land
actions.add('build_house', {
  id: 'build_house',
  name: 'Build House',
  baseCosts: { [CResource.ap]: 0 },
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
  baseCosts: { [CResource.ap]: 0 },
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
  baseCosts: { [CResource.ap]: 0 },
  effects: [
    {
      type: 'development',
      method: 'add',
      params: { id: 'house', landId: 'A-L1' },
    },
  ],
});

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
    ctx.phases,
    ctx.compensations,
    ctx.actionCostResource,
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

describe('development:add effect', () => {
  it('adds house and applies onBuild effects', () => {
    const ctx = createTestEngine({ actions });
    const land = ctx.activePlayer.lands[1];
    const slotsBefore = land.slotsUsed;
    const expected = simulateBuild(ctx, 'house', land.id);
    performAction('build_house', ctx);
    expect(land.developments).toContain('house');
    expect(land.slotsUsed).toBe(slotsBefore + 1);
    expect(ctx.activePlayer.resources).toEqual(expected.activePlayer.resources);
    for (const [statKey, statValue] of Object.entries(
      expected.activePlayer.stats,
    )) {
      expect(
        ctx.activePlayer.stats[statKey as keyof typeof ctx.activePlayer.stats],
      ).toBeCloseTo(statValue, 5);
    }
  });

  it('throws if land does not exist', () => {
    const ctx = createTestEngine({ actions });
    expect(() => performAction('build_house_bad_land', ctx)).toThrow(
      /Land A-L9 not found/,
    );
  });

  it('throws if land has no free slots', () => {
    const ctx = createTestEngine({ actions });
    expect(() => performAction('build_house_full', ctx)).toThrow(
      /No free slots on land A-L1/,
    );
  });
});
