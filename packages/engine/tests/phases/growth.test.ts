import { describe, it, expect } from 'vitest';
import { advance, Stat } from '../../src';
import {
  PHASES,
  GAME_START,
  Resource as CResource,
  Stat as CStat,
  PopulationRole,
  DEVELOPMENTS,
  POPULATIONS,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';

const growthPhase = PHASES[0];
const growthId = growthPhase.id;
const farmId = Array.from(
  (DEVELOPMENTS as unknown as { map: Map<string, unknown> }).map.keys(),
).find((id) => DEVELOPMENTS.get(id)?.onGainIncomeStep) as string;
const farmGoldGain = Number(
  DEVELOPMENTS.get(farmId)?.onGainIncomeStep?.[0]?.effects?.find(
    (e) => e.type === 'resource' && e.method === 'add',
  )?.params?.amount ?? 0,
);
const councilApGain = Number(
  POPULATIONS.get(PopulationRole.Council)?.onGainAPStep?.find(
    (e) => e.type === 'resource' && e.method === 'add',
  )?.params?.amount ?? 0,
);

describe('Growth phase', () => {
  it('triggers population and development effects', () => {
    const ctx = createTestEngine();
    const player = ctx.activePlayer;
    const apBefore = player.ap;
    const goldBefore = player.gold;
    while (ctx.game.currentPhase === growthId) advance(ctx);
    const councils = player.population[PopulationRole.Council];
    expect(player.ap).toBe(apBefore + councilApGain * councils);
    expect(player.gold).toBe(goldBefore + farmGoldGain);
  });

  it('applies player B compensation at start and not during growth', () => {
    const ctx = createTestEngine();
    const baseAp = GAME_START.player.resources?.[CResource.ap] || 0;
    const comp =
      (GAME_START.players?.B?.resources?.[CResource.ap] || 0) - baseAp;
    expect(ctx.game.players[0].ap).toBe(baseAp);
    expect(ctx.game.players[1].ap).toBe(baseAp + comp);

    const gainApIdx = growthPhase.steps.findIndex((s) => s.id === 'gain-ap');

    // Player A growth
    let player = ctx.activePlayer;
    player.ap = 0;
    ctx.game.currentPhase = growthId;
    ctx.game.currentStep = 'gain-ap';
    ctx.game.stepIndex = gainApIdx;
    advance(ctx);
    const councilsA = player.population[PopulationRole.Council];
    expect(player.ap).toBe(councilApGain * councilsA);

    // Player B growth (compensation already applied)
    ctx.game.currentPlayerIndex = 1;
    ctx.game.currentPhase = growthId;
    ctx.game.currentStep = 'gain-ap';
    ctx.game.stepIndex = gainApIdx;
    player = ctx.activePlayer;
    player.ap = 0;
    advance(ctx);
    const councilsB = player.population[PopulationRole.Council];
    expect(player.ap).toBe(councilApGain * councilsB);

    // Subsequent Player B growth phases
    for (let i = 0; i < 3; i++) {
      ctx.game.currentPlayerIndex = 1;
      ctx.game.currentPhase = growthId;
      ctx.game.currentStep = 'gain-ap';
      ctx.game.stepIndex = gainApIdx;
      player.ap = 0;
      advance(ctx);
      expect(player.ap).toBe(councilApGain * councilsB);
    }
  });

  it('grows legion and fortifier stats', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.population[PopulationRole.Legion] = 1;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 1;
    ctx.activePlayer.stats[Stat.armyStrength] = 8;
    ctx.activePlayer.stats[Stat.fortificationStrength] = 4;
    const player = ctx.activePlayer;
    const growth = player.stats[Stat.growth];
    while (ctx.game.currentPhase === growthId) advance(ctx);
    const expectedArmy = Math.ceil(8 + 8 * growth);
    const expectedFort = Math.ceil(4 + 4 * growth);
    expect(player.stats[Stat.armyStrength]).toBe(expectedArmy);
    expect(player.stats[Stat.fortificationStrength]).toBe(expectedFort);
    expect(Number.isInteger(player.stats[Stat.armyStrength])).toBe(true);
    expect(Number.isInteger(player.stats[Stat.fortificationStrength])).toBe(
      true,
    );
    expect(player.stats[Stat.armyStrength]).toBeGreaterThanOrEqual(0);
    expect(player.stats[Stat.fortificationStrength]).toBeGreaterThanOrEqual(0);
  });

  it('scales strength additively with multiple leaders', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.population[PopulationRole.Legion] = 2;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 2;
    ctx.activePlayer.stats[Stat.armyStrength] = 10;
    ctx.activePlayer.stats[Stat.fortificationStrength] = 10;
    const growth = ctx.activePlayer.stats[Stat.growth];
    while (ctx.game.currentPhase === growthId) advance(ctx);
    const expectedArmy = Math.ceil(10 + 10 * growth * 2);
    const expectedFort = Math.ceil(10 + 10 * growth * 2);
    expect(ctx.activePlayer.stats[Stat.armyStrength]).toBe(expectedArmy);
    expect(ctx.activePlayer.stats[Stat.fortificationStrength]).toBe(
      expectedFort,
    );
    expect(Number.isInteger(ctx.activePlayer.stats[Stat.armyStrength])).toBe(
      true,
    );
    expect(
      Number.isInteger(ctx.activePlayer.stats[Stat.fortificationStrength]),
    ).toBe(true);
    expect(ctx.activePlayer.stats[Stat.armyStrength]).toBeGreaterThanOrEqual(0);
    expect(
      ctx.activePlayer.stats[Stat.fortificationStrength],
    ).toBeGreaterThanOrEqual(0);
  });

  describe('strength growth scenarios', () => {
    const baseArmy = 5;
    const baseFort = 5;
    const baseGrowth = Number(GAME_START.player.stats?.[CStat.growth] ?? 0);
    it.each([
      {
        label: '0 fortifiers',
        legions: 0,
        fortifiers: 0,
        expArmy: Math.ceil(baseArmy + baseArmy * baseGrowth * 0),
        expFort: Math.ceil(baseFort + baseFort * baseGrowth * 0),
      },
      {
        label: '3 fortifiers',
        legions: 0,
        fortifiers: 3,
        expArmy: Math.ceil(baseArmy + baseArmy * baseGrowth * 0),
        expFort: Math.ceil(baseFort + baseFort * baseGrowth * 3),
      },
      {
        label: '15 fortifiers',
        legions: 0,
        fortifiers: 15,
        expArmy: Math.ceil(baseArmy + baseArmy * baseGrowth * 0),
        expFort: Math.ceil(baseFort + baseFort * baseGrowth * 15),
      },
      {
        label: '5 fortifiers and 5 legions',
        legions: 5,
        fortifiers: 5,
        expArmy: Math.ceil(baseArmy + baseArmy * baseGrowth * 5),
        expFort: Math.ceil(baseFort + baseFort * baseGrowth * 5),
      },
    ])('$label', ({ legions, fortifiers, expArmy, expFort }) => {
      const ctx = createTestEngine();
      const player = ctx.activePlayer;
      player.population[PopulationRole.Legion] = legions;
      player.population[PopulationRole.Fortifier] = fortifiers;
      player.stats[Stat.armyStrength] = baseArmy;
      player.stats[Stat.fortificationStrength] = baseFort;
      while (ctx.game.currentPhase === growthId) advance(ctx);
      expect(player.stats[Stat.armyStrength]).toBe(expArmy);
      expect(player.stats[Stat.fortificationStrength]).toBe(expFort);
      expect(Number.isInteger(player.stats[Stat.armyStrength])).toBe(true);
      expect(Number.isInteger(player.stats[Stat.fortificationStrength])).toBe(
        true,
      );
      expect(player.stats[Stat.armyStrength]).toBeGreaterThanOrEqual(0);
      expect(player.stats[Stat.fortificationStrength]).toBeGreaterThanOrEqual(
        0,
      );
    });

    it('never drops below zero', () => {
      const ctx = createTestEngine();
      const player = ctx.activePlayer;
      player.population[PopulationRole.Legion] = 1;
      player.population[PopulationRole.Fortifier] = 1;
      player.stats[Stat.armyStrength] = -5;
      player.stats[Stat.fortificationStrength] = -5;
      while (ctx.game.currentPhase === growthId) advance(ctx);
      expect(player.stats[Stat.armyStrength]).toBe(0);
      expect(player.stats[Stat.fortificationStrength]).toBe(0);
      expect(Number.isInteger(player.stats[Stat.armyStrength])).toBe(true);
      expect(Number.isInteger(player.stats[Stat.fortificationStrength])).toBe(
        true,
      );
    });
  });
});
