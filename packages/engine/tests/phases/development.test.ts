import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  PopulationRole,
  Stat,
  Resource,
  POPULATIONS,
  DEVELOPMENTS,
} from '../../src';

const council = POPULATIONS.get(PopulationRole.Council);
const councilApGain =
  council.onDevelopmentPhase?.find(
    (e) => e.type === 'resource' && e.method === 'add' && e.params.key === Resource.ap,
  )?.params.amount ?? 0;

const farm = DEVELOPMENTS.get('farm');
const farmGoldGain =
  farm.onDevelopmentPhase?.find(
    (e) => e.type === 'resource' && e.method === 'add' && e.params.key === Resource.gold,
  )?.params.amount ?? 0;

const commanderPct =
  POPULATIONS.get(PopulationRole.Commander).onDevelopmentPhase?.find(
    (e) => e.type === 'stat' && e.method === 'add_pct' && e.params.key === Stat.armyStrength,
  )?.params.percent ?? 0;
const fortifierPct =
  POPULATIONS.get(PopulationRole.Fortifier).onDevelopmentPhase?.find(
    (e) =>
      e.type === 'stat' &&
      e.method === 'add_pct' &&
      e.params.key === Stat.fortificationStrength,
  )?.params.percent ?? 0;

describe('Development phase', () => {
  it('triggers population and development effects', () => {
    const ctx = createEngine();
    const apBefore = ctx.activePlayer.ap;
    const goldBefore = ctx.activePlayer.gold;
    runDevelopment(ctx);
    const councils = ctx.activePlayer.population[PopulationRole.Council];
    expect(ctx.activePlayer.ap).toBe(apBefore + councilApGain * councils);
    expect(ctx.activePlayer.gold).toBe(goldBefore + farmGoldGain);
  });

  it('grows commander and fortifier stats', () => {
    const ctx = createEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 1;
    ctx.activePlayer.stats[Stat.armyStrength] = 8;
    ctx.activePlayer.stats[Stat.fortificationStrength] = 4;
    runDevelopment(ctx);
    const expectedArmy =
      8 + 8 * (commanderPct / 100);
    const expectedFort =
      4 + 4 * (fortifierPct / 100);
    expect(ctx.activePlayer.stats[Stat.armyStrength]).toBeCloseTo(expectedArmy);
    expect(ctx.activePlayer.stats[Stat.fortificationStrength]).toBeCloseTo(expectedFort);
  });
});
