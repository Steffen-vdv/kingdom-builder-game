import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runUpkeep,
  PopulationRole,
  Resource,
  POPULATIONS,
} from '../../src';

const councilUpkeep =
  POPULATIONS.get(PopulationRole.Council).onUpkeepPhase?.find(
    (e) => e.type === 'resource' && e.method === 'remove' && e.params.key === Resource.gold,
  )?.params.amount ?? 0;
const commanderUpkeep =
  POPULATIONS.get(PopulationRole.Commander).onUpkeepPhase?.find(
    (e) => e.type === 'resource' && e.method === 'remove' && e.params.key === Resource.gold,
  )?.params.amount ?? 0;
const fortifierUpkeep =
  POPULATIONS.get(PopulationRole.Fortifier).onUpkeepPhase?.find(
    (e) => e.type === 'resource' && e.method === 'remove' && e.params.key === Resource.gold,
  )?.params.amount ?? 0;

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
