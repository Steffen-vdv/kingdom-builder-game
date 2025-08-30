import { describe, it, expect } from 'vitest';
import {
  createEngine,
  advance,
  PopulationRole,
  Resource,
  POPULATIONS,
  PHASES,
} from '../../src';

const councilUpkeep = Number(
  POPULATIONS.get(PopulationRole.Council).onUpkeepPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'remove' &&
      effect.params.key === Resource.gold,
  )?.params.amount ?? 0,
);
const commanderUpkeep = Number(
  POPULATIONS.get(PopulationRole.Commander).onUpkeepPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'remove' &&
      effect.params.key === Resource.gold,
  )?.params.amount ?? 0,
);
const fortifierUpkeep = Number(
  POPULATIONS.get(PopulationRole.Fortifier).onUpkeepPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'remove' &&
      effect.params.key === Resource.gold,
  )?.params.amount ?? 0,
);

describe('Upkeep phase', () => {
  it('charges gold per population role', () => {
    const ctx = createEngine();
    ctx.game.phaseIndex = 1;
    ctx.game.currentPhase = PHASES[1]!.id;
    ctx.game.currentStep = PHASES[1]!.steps[0]!.id;
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 1;
    const startGold = 5;
    ctx.activePlayer.gold = startGold;
    const councils = ctx.activePlayer.population[PopulationRole.Council];
    const player = ctx.activePlayer;
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const expectedGold =
      startGold -
      (councilUpkeep * councils + commanderUpkeep + fortifierUpkeep);
    expect(player.gold).toBe(expectedGold);
  });

  it('throws if upkeep cannot be paid', () => {
    const ctx = createEngine();
    ctx.game.phaseIndex = 1;
    ctx.game.currentPhase = PHASES[1]!.id;
    ctx.game.currentStep = PHASES[1]!.steps[0]!.id;
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    const councils = ctx.activePlayer.population[PopulationRole.Council];
    const totalCost = councilUpkeep * councils + commanderUpkeep;
    ctx.activePlayer.gold = totalCost - 1;
    expect(() => advance(ctx)).toThrow();
  });
});
