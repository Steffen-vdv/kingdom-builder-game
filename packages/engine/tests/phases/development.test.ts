import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  PopulationRole,
  Stat,
  Resource,
  POPULATIONS,
  DEVELOPMENTS,
} from '../../src/index.ts';

function effectValue<K extends 'amount' | 'percent'> (
  events:
    | { type: string; params?: Record<string, any> }[]
    | undefined,
  predicate: (e: { type: string; params?: Record<string, any> }) => boolean,
  key: K,
): number {
  const effect = events?.find(predicate);
  return (effect?.params?.[key] as number) ?? 0;
}

const council = POPULATIONS.get(PopulationRole.Council)!;
const councilApGain = effectValue(
  council.onDevelopmentPhase,
  (e) => e.type === 'add_resource' && e.params?.key === Resource.ap,
  'amount',
);

const farm = DEVELOPMENTS.get('farm')!;
const farmGoldGain = effectValue(
  farm.onDevelopmentPhase,
  (e) => e.type === 'add_resource' && e.params?.key === Resource.gold,
  'amount',
);

const commanderPct = effectValue(
  POPULATIONS.get(PopulationRole.Commander)!.onDevelopmentPhase,
  (e) => e.type === 'add_stat_pct' && e.params?.key === Stat.armyStrength,
  'percent',
);
const fortifierPct = effectValue(
  POPULATIONS.get(PopulationRole.Fortifier)!.onDevelopmentPhase,
  (e) =>
    e.type === 'add_stat_pct' &&
    e.params?.key === Stat.fortificationStrength,
  'percent',
);

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
