import { describe, it, expect } from 'vitest';
import {
  createEngine,
  advance,
  performAction,
  Resource,
  POPULATIONS,
  DEVELOPMENTS,
  PopulationRole,
} from '../../packages/engine/src/index.ts';
import { getActionOutcome, simulateEffects } from './fixtures';

describe('Turn cycle integration', () => {
  it('processes development, upkeep, and main phases for both players', () => {
    const ctx = createEngine();
    expect(ctx.game.turn).toBe(1);
    expect(ctx.game.currentPhase).toBe('development');
    expect(ctx.game.currentPlayerIndex).toBe(0);
    const councilDev = simulateEffects(
      POPULATIONS.get(PopulationRole.Council).onDevelopmentPhase || [],
      ctx,
    );
    const apGain = councilDev.resources[Resource.ap] || 0;
    const farmDev = simulateEffects(
      DEVELOPMENTS.get('farm').onDevelopmentPhase || [],
      ctx,
    );
    const farmGold = farmDev.resources[Resource.gold] || 0;
    const councilUpkeep = simulateEffects(
      POPULATIONS.get(PopulationRole.Council).onUpkeepPhase || [],
      ctx,
    );
    const upkeepGold = councilUpkeep.resources[Resource.gold] || 0;

    // Player A development
    ctx.game.currentPlayerIndex = 0;
    const playerA = ctx.activePlayer;
    const startGoldA = playerA.gold;
    const startApA = playerA.ap;
    advance(ctx);
    expect(ctx.game.currentPhase).toBe('development');
    expect(playerA.ap).toBe(startApA + apGain);
    expect(playerA.gold).toBe(startGoldA + farmGold);
    const afterDevGoldA = playerA.gold;

    // Player B development
    ctx.game.currentPlayerIndex = 1;
    const playerB = ctx.activePlayer;
    const startGoldB = playerB.gold;
    const startApB = playerB.ap;
    advance(ctx);
    expect(playerB.ap).toBe(startApB + apGain);
    expect(playerB.gold).toBe(startGoldB + farmGold);
    const afterDevGoldB = playerB.gold;

    // Player A upkeep
    ctx.game.currentPlayerIndex = 0;
    const upkeepA = ctx.activePlayer;
    advance(ctx);
    expect(ctx.game.currentPhase).toBe('upkeep');
    expect(upkeepA.gold).toBe(afterDevGoldA + upkeepGold);

    // Player B upkeep
    ctx.game.currentPlayerIndex = 1;
    const upkeepB = ctx.activePlayer;
    advance(ctx);
    expect(upkeepB.gold).toBe(afterDevGoldB + upkeepGold);

    // Main phase actions
    expect(ctx.game.currentPhase).toBe('main');

    ctx.game.currentPlayerIndex = 0;
    const expandA = getActionOutcome('expand', ctx);
    const resBeforeA = { ...ctx.activePlayer.resources };
    const statsBeforeA = { ...ctx.activePlayer.stats };
    const landBeforeA = ctx.activePlayer.lands.length;
    performAction('expand', ctx);
    for (const [key, cost] of Object.entries(expandA.costs)) {
      const gain = expandA.results.resources[key] || 0;
      expect(ctx.activePlayer.resources[key]).toBe(
        resBeforeA[key] - cost + gain,
      );
    }
    for (const [key, gain] of Object.entries(expandA.results.resources)) {
      if (expandA.costs[key] === undefined) {
        expect(ctx.activePlayer.resources[key]).toBe(resBeforeA[key] + gain);
      }
    }
    expect(ctx.activePlayer.lands.length).toBe(
      landBeforeA + expandA.results.land,
    );
    for (const [key, gain] of Object.entries(expandA.results.stats)) {
      expect(ctx.activePlayer.stats[key]).toBe(statsBeforeA[key] + gain);
    }

    ctx.game.currentPlayerIndex = 1;
    const expandB = getActionOutcome('expand', ctx);
    const resBeforeB = { ...ctx.activePlayer.resources };
    const statsBeforeB = { ...ctx.activePlayer.stats };
    const landBeforeB = ctx.activePlayer.lands.length;
    performAction('expand', ctx);
    for (const [key, cost] of Object.entries(expandB.costs)) {
      const gain = expandB.results.resources[key] || 0;
      expect(ctx.activePlayer.resources[key]).toBe(
        resBeforeB[key] - cost + gain,
      );
    }
    for (const [key, gain] of Object.entries(expandB.results.resources)) {
      if (expandB.costs[key] === undefined) {
        expect(ctx.activePlayer.resources[key]).toBe(resBeforeB[key] + gain);
      }
    }
    expect(ctx.activePlayer.lands.length).toBe(
      landBeforeB + expandB.results.land,
    );
    for (const [key, gain] of Object.entries(expandB.results.stats)) {
      expect(ctx.activePlayer.stats[key]).toBe(statsBeforeB[key] + gain);
    }

    // End turn reset
    ctx.game.currentPlayerIndex = 0;
    advance(ctx);
    ctx.game.currentPlayerIndex = 1;
    advance(ctx);
    expect(ctx.game.turn).toBe(2);
    expect(ctx.game.currentPhase).toBe('development');
    expect(ctx.game.currentPlayerIndex).toBe(0);
  });
});
