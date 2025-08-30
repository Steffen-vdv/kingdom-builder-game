import { describe, it, expect } from 'vitest';
import {
  createEngine,
  advance,
  PopulationRole,
  Stat,
  Resource,
  POPULATIONS,
  DEVELOPMENTS,
} from '../../src';

const council = POPULATIONS.get(PopulationRole.Council);
const councilApGain = Number(
  council.onDevelopmentPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'add' &&
      effect.params.key === Resource.ap,
  )?.params.amount ?? 0,
);

const farm = DEVELOPMENTS.get('farm');
const farmGoldGain = Number(
  farm.onDevelopmentPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'add' &&
      effect.params.key === Resource.gold,
  )?.params.amount ?? 0,
);

const commanderPct = Number(
  POPULATIONS.get(PopulationRole.Commander).onDevelopmentPhase?.find(
    (effect) =>
      effect.type === 'stat' &&
      effect.method === 'add_pct' &&
      effect.params.key === Stat.armyStrength,
  )?.params.percent ?? 0,
);
const fortifierPct = Number(
  POPULATIONS.get(PopulationRole.Fortifier).onDevelopmentPhase?.find(
    (effect) =>
      effect.type === 'stat' &&
      effect.method === 'add_pct' &&
      effect.params.key === Stat.fortificationStrength,
  )?.params.percent ?? 0,
);

describe('Development phase', () => {
  it('triggers population and development effects', () => {
    const ctx = createEngine();
    const player = ctx.activePlayer;
    const apBefore = player.ap;
    const goldBefore = player.gold;
    advance(ctx);
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
    advance(ctx);
    const expectedArmy = 8 + 8 * (commanderPct / 100);
    const expectedFort = 4 + 4 * (fortifierPct / 100);
    expect(player.stats[Stat.armyStrength]).toBeCloseTo(expectedArmy);
    expect(player.stats[Stat.fortificationStrength]).toBeCloseTo(expectedFort);
  });
});
