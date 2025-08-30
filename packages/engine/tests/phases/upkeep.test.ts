import { describe, it, expect } from 'vitest';
import { advance, PopulationRole, Resource } from '../../src';
import { createTestEngine, PHASES } from '../test-utils';

const upkeepPhase = PHASES.find((p) => p.id === 'upkeep')!;
const payStep = upkeepPhase.steps.find((s) => s.id === 'pay-upkeep')!;

function getUpkeep(role: PopulationRole) {
  return Number(
    payStep.effects
      ?.find((e) => e.evaluator?.params?.role === role)
      ?.effects?.find(
        (eff) =>
          eff.type === 'resource' &&
          eff.method === 'remove' &&
          eff.params.key === Resource.gold,
      )?.params.amount ?? 0,
  );
}

const councilUpkeep = getUpkeep(PopulationRole.Council);
const commanderUpkeep = getUpkeep(PopulationRole.Commander);
const fortifierUpkeep = getUpkeep(PopulationRole.Fortifier);

describe('Upkeep phase', () => {
  it('charges gold per population role', () => {
    const ctx = createTestEngine();
    const idx = PHASES.findIndex((p) => p.id === 'upkeep');
    ctx.game.phaseIndex = idx;
    ctx.game.currentPhase = PHASES[idx]!.id;
    ctx.game.stepIndex = PHASES[idx]!.steps.findIndex(
      (s) => s.id === 'pay-upkeep',
    );
    ctx.game.currentStep = payStep.id;
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
    const ctx = createTestEngine();
    const idx = PHASES.findIndex((p) => p.id === 'upkeep');
    ctx.game.phaseIndex = idx;
    ctx.game.currentPhase = PHASES[idx]!.id;
    ctx.game.stepIndex = PHASES[idx]!.steps.findIndex(
      (s) => s.id === 'pay-upkeep',
    );
    ctx.game.currentStep = payStep.id;
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    const councils = ctx.activePlayer.population[PopulationRole.Council];
    const totalCost = councilUpkeep * councils + commanderUpkeep;
    ctx.activePlayer.gold = totalCost - 1;
    expect(() => advance(ctx)).toThrow();
  });
});
