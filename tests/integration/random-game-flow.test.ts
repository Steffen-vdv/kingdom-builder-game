import { describe, it, expect } from 'vitest';
import {
  performAction,
  advance,
  getActionCosts,
} from '@kingdom-builder/engine';
import { createSyntheticContext } from './synthetic';

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('random action flow', () => {
  it('advances phases, pays costs and applies effects across turns', () => {
    const { ctx, actions, phases, costKey, gainKey } = createSyntheticContext();
    const actionIds = actions.map((a) => a.id);
    const mainPhase = phases[0].id;
    const endPhase = phases[1].id;
    const endStep = phases[1].steps[0];
    const effects = endStep.effects as
      | { type?: string; method?: string; params?: { amount: number } }[]
      | undefined;
    const regenEffect = (effects || []).find(
      (e) => e.type === 'resource' && e.method === 'add',
    );
    const regenAmount = (regenEffect?.params as { amount: number }).amount;
    const rng = createRng(42);
    const initialTurn = ctx.game.turn;
    const turns = 3;

    for (let t = 0; t < turns; t++) {
      for (let p = 0; p < ctx.game.players.length; p++) {
        expect(ctx.game.currentPhase).toBe(mainPhase);
        while ((ctx.activePlayer.resources[costKey] ?? 0) > 0) {
          const actionId = actionIds[Math.floor(rng() * actionIds.length)];
          const costs = getActionCosts(actionId, ctx);
          const beforeCost = ctx.activePlayer.resources[costKey];
          const beforeGain = ctx.activePlayer.resources[gainKey];
          const action = ctx.actions.get(actionId)!;
          const gain = (
            action.effects.find(
              (e) => e.type === 'resource' && e.method === 'add',
            )!.params as { amount: number }
          ).amount;
          performAction(actionId, ctx);
          expect(ctx.activePlayer.resources[costKey]).toBe(
            beforeCost - (costs[costKey] ?? 0),
          );
          expect(ctx.activePlayer.resources[gainKey]).toBe(beforeGain + gain);
        }
        const currentIndex = ctx.game.currentPlayerIndex;
        advance(ctx);
        expect(ctx.game.currentPhase).toBe(endPhase);
        expect(ctx.game.currentPlayerIndex).toBe(currentIndex);
        const player = ctx.activePlayer;
        const beforeRegen = player.resources[costKey];
        advance(ctx);
        expect(player.resources[costKey]).toBe(beforeRegen + regenAmount);
        expect(ctx.game.currentPhase).toBe(mainPhase);
        expect(ctx.game.currentPlayerIndex).toBe(
          (currentIndex + 1) % ctx.game.players.length,
        );
      }
    }
    expect(ctx.game.turn).toBe(initialTurn + turns);
  });
});
