import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runEffects,
  BUILDINGS,
  PHASES,
  type EffectDef,
} from '../../src/index.ts';

// Test that evaluation-based result modifiers apply per development

describe('evaluation result modifiers', () => {
  it('Mill grants extra gold for each Farm income', () => {
    const ctx = createEngine();
    // Add Mill to active player
    runEffects(
      [
        {
          type: 'building',
          method: 'add',
          params: { id: 'mill' },
        },
      ],
      ctx,
    );
    const before = ctx.activePlayer.gold;
    const gainIncome = PHASES.find((p) => p.id === 'development')!.steps.find(
      (s) => s.id === 'gain-income',
    )!.effects!;
    runEffects(gainIncome, ctx);
    const farmEffect = gainIncome[0]!;
    const baseAmount = Number(farmEffect.effects?.[0]?.params?.['amount'] ?? 0);
    const millDef = BUILDINGS.get('mill');
    const bonusEffect = millDef.onBuild?.find(
      (e: EffectDef) => e.params?.['id'] === 'mill_farm_bonus',
    );
    const bonusAmount = Number(
      bonusEffect?.effects?.find(
        (e) => e.type === 'resource' && e.method === 'add',
      )?.params?.['amount'] ?? 0,
    );
    const farms = ctx.activePlayer.lands.reduce(
      (acc, land) => acc + land.developments.filter((d) => d === 'farm').length,
      0,
    );
    expect(ctx.activePlayer.gold).toBe(
      before + farms * (baseAmount + bonusAmount),
    );
  });
});
