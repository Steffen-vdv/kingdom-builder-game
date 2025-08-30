import { describe, it, expect } from 'vitest';
import {
  createEngine,
  advance,
  PopulationRole,
  Stat,
  Resource,
  PHASES,
} from '../../src';

const devPhase = PHASES.find((p) => p.id === 'development')!;
const incomeStep = devPhase.steps.find((s) => s.id === 'gain-income');
const farmGoldGain = Number(
  incomeStep?.effects?.[0]?.effects?.find(
    (e) =>
      e.type === 'resource' &&
      e.method === 'add' &&
      (e as { params: { key: string } }).params.key === Resource.gold,
  )?.params.amount ?? 0,
);

const apStep = devPhase.steps.find((s) => s.id === 'gain-ap');
const councilApGain = Number(
  apStep?.effects?.[0]?.effects?.find(
    (e) =>
      e.type === 'resource' &&
      e.method === 'add' &&
      (e as { params: { key: string } }).params.key === Resource.ap,
  )?.params.amount ?? 0,
);

const raiseStep = devPhase.steps.find((s) => s.id === 'raise-strength');
const commanderPct = Number(
  raiseStep?.effects
    ?.find((e) => e.evaluator?.params?.role === PopulationRole.Commander)
    ?.effects?.find(
      (eff) =>
        eff.type === 'stat' &&
        eff.method === 'add_pct' &&
        eff.params.key === Stat.armyStrength,
    )?.params.percent ?? 0,
);
const fortifierPct = Number(
  raiseStep?.effects
    ?.find((e) => e.evaluator?.params?.role === PopulationRole.Fortifier)
    ?.effects?.find(
      (eff) =>
        eff.type === 'stat' &&
        eff.method === 'add_pct' &&
        eff.params.key === Stat.fortificationStrength,
    )?.params.percent ?? 0,
);

describe('Development phase', () => {
  it('triggers population and development effects', () => {
    const ctx = createEngine();
    const player = ctx.activePlayer;
    const apBefore = player.ap;
    const goldBefore = player.gold;
    while (ctx.game.currentPhase === 'development') advance(ctx);
    const councils = player.population[PopulationRole.Council];
    expect(player.ap).toBe(apBefore + councilApGain * councils);
    expect(player.gold).toBe(goldBefore + farmGoldGain);
  });

  it('grows commander and fortifier stats', () => {
    const ctx = createEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 1;
    ctx.activePlayer.stats[Stat.armyStrength] = 8;
    ctx.activePlayer.stats[Stat.fortificationStrength] = 4;
    const player = ctx.activePlayer;
    while (ctx.game.currentPhase === 'development') advance(ctx);
    const expectedArmy = 8 + 8 * (commanderPct / 100);
    const expectedFort = 4 + 4 * (fortifierPct / 100);
    expect(player.stats[Stat.armyStrength]).toBeCloseTo(expectedArmy);
    expect(player.stats[Stat.fortificationStrength]).toBeCloseTo(expectedFort);
  });

  it('scales strength additively with multiple leaders', () => {
    const ctx = createEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 2;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 2;
    ctx.activePlayer.stats[Stat.armyStrength] = 10;
    ctx.activePlayer.stats[Stat.fortificationStrength] = 10;
    while (ctx.game.currentPhase === 'development') advance(ctx);
    const expectedArmy = 10 + 10 * (commanderPct / 100) * 2;
    const expectedFort = 10 + 10 * (fortifierPct / 100) * 2;
    expect(ctx.activePlayer.stats[Stat.armyStrength]).toBeCloseTo(expectedArmy);
    expect(ctx.activePlayer.stats[Stat.fortificationStrength]).toBeCloseTo(
      expectedFort,
    );
  });
});
