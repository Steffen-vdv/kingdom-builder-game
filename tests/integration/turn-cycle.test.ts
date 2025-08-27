import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  runUpkeep,
  performAction,
  Resource,
  Phase,
  POPULATIONS,
  DEVELOPMENTS,
  PopulationRole,
} from '../../packages/engine/src/index.ts';
import { getActionOutcome, simulateEffects } from './fixtures';

describe('Turn cycle integration', () => {
  it('processes development, upkeep, and main phases for both players', () => {
    const ctx = createEngine();
    expect(ctx.game.turn).toBe(1);
    expect(ctx.game.currentPhase).toBe(Phase.Development);
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
    const startGoldA = ctx.activePlayer.gold;
    const startApA = ctx.activePlayer.ap;
    runDevelopment(ctx);
    expect(ctx.game.currentPhase).toBe(Phase.Development);
    expect(ctx.activePlayer.ap).toBe(startApA + apGain);
    expect(ctx.activePlayer.gold).toBe(startGoldA + farmGold);
    const afterDevGoldA = ctx.activePlayer.gold;

    // Player B development
    ctx.game.currentPlayerIndex = 1;
    const startGoldB = ctx.activePlayer.gold;
    const startApB = ctx.activePlayer.ap;
    runDevelopment(ctx);
    expect(ctx.activePlayer.ap).toBe(startApB + apGain);
    expect(ctx.activePlayer.gold).toBe(startGoldB + farmGold);
    const afterDevGoldB = ctx.activePlayer.gold;

    // Player A upkeep
    ctx.game.currentPlayerIndex = 0;
    runUpkeep(ctx);
    expect(ctx.game.currentPhase).toBe(Phase.Upkeep);
    expect(ctx.activePlayer.gold).toBe(afterDevGoldA + upkeepGold);

    // Player B upkeep
    ctx.game.currentPlayerIndex = 1;
    runUpkeep(ctx);
    expect(ctx.activePlayer.gold).toBe(afterDevGoldB + upkeepGold);

    // Main phase actions
    ctx.game.currentPhase = Phase.Main;

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
    ctx.game.turn += 1;
    ctx.game.currentPhase = Phase.Development;
    ctx.game.currentPlayerIndex = 0;
    expect(ctx.game.turn).toBe(2);
    expect(ctx.game.currentPhase).toBe(Phase.Development);
    expect(ctx.game.currentPlayerIndex).toBe(0);
  });
});
