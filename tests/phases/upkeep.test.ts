import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runUpkeep,
  PopulationRole,
  Resource,
  POPULATIONS,
} from '../../src/engine';

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

const councilUpkeep = effectValue(
  POPULATIONS.get(PopulationRole.Council)!.onUpkeepPhase,
  (e) => e.type === 'pay_resource' && e.params?.key === Resource.gold,
  'amount',
);
const commanderUpkeep = effectValue(
  POPULATIONS.get(PopulationRole.Commander)!.onUpkeepPhase,
  (e) => e.type === 'pay_resource' && e.params?.key === Resource.gold,
  'amount',
);
const fortifierUpkeep = effectValue(
  POPULATIONS.get(PopulationRole.Fortifier)!.onUpkeepPhase,
  (e) => e.type === 'pay_resource' && e.params?.key === Resource.gold,
  'amount',
);

describe('Upkeep phase', () => {
  it('charges gold per population role', () => {
    const ctx = createEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 1;
    const startGold = 5;
    ctx.activePlayer.gold = startGold;
    const councils = ctx.activePlayer.population[PopulationRole.Council];
    runUpkeep(ctx);
    const expectedGold =
      startGold -
      (councilUpkeep * councils + commanderUpkeep + fortifierUpkeep);
    expect(ctx.activePlayer.gold).toBe(expectedGold);
  });

  it('throws if upkeep cannot be paid', () => {
    const ctx = createEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    const councils = ctx.activePlayer.population[PopulationRole.Council];
    const totalCost = councilUpkeep * councils + commanderUpkeep;
    ctx.activePlayer.gold = totalCost - 1;
    expect(() => runUpkeep(ctx)).toThrow();
  });
});
