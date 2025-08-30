import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  Resource,
  PopulationRole,
  runEffects,
  EVALUATORS,
} from '../../src';
import type { EffectDef } from '../../src/effects';
import type { EvaluatorDef } from '../../src/evaluators';
import type { EngineContext } from '../../src';

function getTaxExpectations(ctx: EngineContext) {
  const actionDefinition = ctx.actions.get('tax');
  const container = actionDefinition.effects[0];
  const evaluator = container.evaluator as EvaluatorDef;
  const count = EVALUATORS.get(evaluator.type)(evaluator, ctx) as number;
  const deltas: Record<string, number> = {};
  const subEffects = container.effects as (EffectDef & {
    round?: 'up' | 'down';
  })[];
  for (const subEffect of subEffects) {
    const key = subEffect.params!.key as string;
    let total = (subEffect.params!.amount as number) * count;
    const rounding = subEffect.round;
    if (rounding === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (rounding === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    deltas[key] = total;
  }
  return deltas;
}

describe('Tax action', () => {
  it('grants gold and loses happiness for each population', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    runEffects(
      [
        {
          type: 'population',
          method: 'add',
          params: { role: PopulationRole.Citizen },
        },
      ],
      ctx,
      2,
    );
    const actionDefinition = ctx.actions.get('tax');
    const apBefore = ctx.activePlayer.ap;
    const goldBefore = ctx.activePlayer.gold;
    const hapBefore = ctx.activePlayer.happiness;
    const expected = getTaxExpectations(ctx);
    performAction('tax', ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore + (expected[Resource.gold] || 0),
    );
    expect(ctx.activePlayer.happiness).toBe(
      hapBefore + (expected[Resource.happiness] || 0),
    );
    const cost = actionDefinition.baseCosts?.[Resource.ap] ?? 0;
    expect(ctx.activePlayer.ap).toBe(apBefore - cost);
  });
});
