import { describe, it, expect } from 'vitest';
import {
  runEffects,
  performAction,
  EVALUATORS,
  advance,
  type EffectDef,
  type EngineContext,
} from '../../src/index.ts';
import {
  BUILDINGS,
  PHASES,
  DEVELOPMENTS,
  Resource as CResource,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import type { EvaluatorDef } from '../../src/evaluators';

const [, millId, , , marketId] = Array.from(
  (BUILDINGS as unknown as { map: Map<string, unknown> }).map.keys(),
);
const [farmId] = Array.from(
  (DEVELOPMENTS as unknown as { map: Map<string, unknown> }).map.keys(),
);

function getOverworkExpectations(ctx: EngineContext) {
  const actionDefinition = ctx.actions.get('overwork');
  const container = actionDefinition.effects[0];
  const evaluator = container.evaluator as EvaluatorDef;
  const count = EVALUATORS.get(evaluator.type)(evaluator, ctx) as number;
  const deltas: Record<string, number> = {};
  const subEffects = container.effects as (EffectDef & {
    round?: 'up' | 'down';
  })[];
  for (let i = 0; i < count; i++)
    for (const subEffect of subEffects) {
      const key = subEffect.params!.key as string;
      let amount = subEffect.params!.amount as number;
      const rounding = subEffect.round;
      if (rounding === 'up')
        amount = amount >= 0 ? Math.ceil(amount) : Math.floor(amount);
      else if (rounding === 'down')
        amount = amount >= 0 ? Math.floor(amount) : Math.ceil(amount);
      deltas[key] = (deltas[key] || 0) + amount;
    }
  return deltas;
}

// Test that evaluation-based result modifiers apply per development

describe('evaluation result modifiers', () => {
  it('Mill grants extra gold for each Farm income', () => {
    const ctx = createTestEngine();
    // Add Mill to active player
    runEffects(
      [
        {
          type: 'building',
          method: 'add',
          params: { id: millId },
        },
      ],
      ctx,
    );
    const before = ctx.activePlayer.gold;
    const gainIncome = PHASES.flatMap((p) => p.steps).find(
      (s) => s.id === 'gain-income',
    )!.effects!;
    runEffects(gainIncome, ctx);
    const farmEffect = gainIncome[0]!;
    const baseAmount = Number(farmEffect.effects?.[0]?.params?.['amount'] ?? 0);
    const millDef = BUILDINGS.get(millId);
    const bonusEffect = millDef.onBuild?.find(
      (e: EffectDef) => e.params?.evaluation?.id === farmId,
    );
    const bonusAmount = Number(bonusEffect?.params?.['amount'] ?? 0);
    const farms = ctx.activePlayer.lands.reduce(
      (acc, land) => acc + land.developments.filter((d) => d === farmId).length,
      0,
    );
    expect(ctx.activePlayer.gold).toBe(
      before + farms * (baseAmount + bonusAmount),
    );
  });

  it('Mill bonus applies to Overwork once per Farm', () => {
    const ctx = createTestEngine();
    runEffects(
      [{ type: 'building', method: 'add', params: { id: millId } }],
      ctx,
    );
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const farms = ctx.activePlayer.lands.reduce(
      (acc, land) => acc + land.developments.filter((d) => d === farmId).length,
      0,
    );
    const bonusEffect = BUILDINGS.get(millId).onBuild?.find(
      (e: EffectDef) => e.params?.evaluation?.id === farmId,
    );
    const bonusAmount = Number(bonusEffect?.params?.['amount'] ?? 0);
    const expected = getOverworkExpectations(ctx);
    const before = ctx.activePlayer.gold;
    performAction('overwork', ctx);
    expect(ctx.activePlayer.gold).toBe(
      before + (expected[CResource.gold] || 0) + farms * bonusAmount,
    );
  });

  it('Market grants extra gold for each population taxed', () => {
    const ctx = createTestEngine();
    runEffects(
      [{ type: 'building', method: 'add', params: { id: marketId } }],
      ctx,
    );
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const actionDef = ctx.actions.get('tax');
    const container = actionDef.effects[0];
    const baseEffect = (container.effects || []).find(
      (e) => e.type === 'resource' && e.method === 'add',
    );
    const baseAmount = Number(baseEffect?.params?.['amount'] ?? 0);
    const bonusEffect = BUILDINGS.get(marketId).onBuild?.find(
      (e: EffectDef) =>
        e.params?.evaluation?.type === 'population' &&
        e.params?.evaluation?.id === 'tax',
    );
    const bonusAmount = Number(bonusEffect?.params?.['amount'] ?? 0);
    const pop = Object.values(ctx.activePlayer.population).reduce(
      (sum, v) => sum + Number(v || 0),
      0,
    );
    const before = ctx.activePlayer.gold;
    performAction('tax', ctx);
    expect(ctx.activePlayer.gold).toBe(
      before + pop * (baseAmount + bonusAmount),
    );
  });
});
