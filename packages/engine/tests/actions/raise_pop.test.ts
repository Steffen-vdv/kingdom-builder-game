import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  runEffects,
  getActionCosts,
  advance,
} from '../../src';
import { PopulationRole, Resource } from '../../src/state';
import type { EffectDef } from '../../src/effects';

function getHappinessGain(ctx: ReturnType<typeof createEngine>) {
  const def = ctx.actions.get('raise_pop');
  const eff = def.effects.find(
    (e) => e.type === 'resource' && e.method === 'add',
  ) as EffectDef & { params: { key: string; amount: number } };
  return eff.params.amount;
}

describe('Raise Population action', () => {
  it('assigns a Council and applies effects', () => {
    const ctx = createEngine();
    ctx.activePlayer.maxPopulation = 2;
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const costs = getActionCosts('raise_pop', ctx);
    const goldBefore = ctx.activePlayer.gold;
    const apBefore = ctx.activePlayer.ap;
    const hapBefore = ctx.activePlayer.happiness;
    const gain = getHappinessGain(ctx);
    const councilDef = ctx.populations.get(PopulationRole.Council);
    const apEffect = councilDef.onAssigned?.find(
      (e) => e.type === 'resource' && e.method === 'add',
    ) as EffectDef<{ key: string; amount: number }> | undefined;
    const apGain = apEffect?.params.amount ?? 0;
    performAction('raise_pop', ctx, { role: PopulationRole.Council });
    expect(ctx.activePlayer.population[PopulationRole.Council]).toBe(2);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore - (costs[Resource.gold] ?? 0),
    );
    expect(ctx.activePlayer.happiness).toBe(hapBefore + gain);
    expect(ctx.activePlayer.ap).toBe(
      apBefore - (costs[Resource.ap] ?? 0) + apGain,
    );
  });

  it('assigns a Commander and grants army strength', () => {
    const ctx = createEngine();
    ctx.activePlayer.maxPopulation = 2;
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const commanderDef = ctx.populations.get(PopulationRole.Commander);
    const passive = commanderDef.onAssigned![0];
    const statGain = (
      passive.effects![0].params as { key: string; amount: number }
    ).amount;
    const before = ctx.activePlayer.armyStrength;
    performAction('raise_pop', ctx, { role: PopulationRole.Commander });
    expect(ctx.activePlayer.population[PopulationRole.Commander]).toBe(1);
    expect(ctx.activePlayer.armyStrength).toBe(before + statGain);
  });

  it('enforces population cap requirement', () => {
    const ctx = createEngine();
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    expect(() =>
      performAction('raise_pop', ctx, { role: PopulationRole.Council }),
    ).toThrow();
  });

  it('removes commander passive when unassigned', () => {
    const ctx = createEngine();
    ctx.activePlayer.maxPopulation = 2;
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    performAction('raise_pop', ctx, { role: PopulationRole.Commander });
    const afterAdd = ctx.activePlayer.armyStrength;
    runEffects(
      [
        {
          type: 'population',
          method: 'remove',
          params: { role: PopulationRole.Commander },
        },
      ],
      ctx,
    );
    expect(ctx.activePlayer.population[PopulationRole.Commander]).toBe(0);
    expect(ctx.activePlayer.armyStrength).toBeLessThan(afterAdd);
  });

  it('removes council AP when unassigned', () => {
    const ctx = createEngine();
    ctx.activePlayer.maxPopulation = 2;
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    performAction('raise_pop', ctx, { role: PopulationRole.Council });
    runEffects(
      [
        {
          type: 'population',
          method: 'remove',
          params: { role: PopulationRole.Council },
        },
      ],
      ctx,
    );
    expect(ctx.activePlayer.population[PopulationRole.Council]).toBe(1);
    expect(ctx.activePlayer.ap).toBe(0);
  });
});
