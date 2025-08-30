import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  Resource,
  EVALUATORS,
  type EngineContext,
} from '../../src/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import type { EvaluatorDef } from '../../src/evaluators/index.ts';

function countFarms(ctx: EngineContext) {
  const evaluator: EvaluatorDef = {
    type: 'development',
    params: { id: 'farm' },
  };
  return EVALUATORS.get(evaluator.type)(evaluator, ctx) as number;
}

function getFarmIncome(ctx: EngineContext) {
  const farm = ctx.developments.get('farm');
  const effect = farm.onDevelopmentPhase?.find(
    (e) => e.type === 'resource' && e.params?.key === Resource.gold,
  ) as { params: { amount: number } } | undefined;
  const amount = effect?.params.amount ?? 0;
  return amount * countFarms(ctx);
}

function getOverworkBaseGold(ctx: EngineContext) {
  const overwork = ctx.actions.get('overwork');
  const container = overwork.effects?.[0];
  if (!container) return 0;
  const evaluator = container.evaluator;
  const count = evaluator
    ? (EVALUATORS.get(evaluator.type)(evaluator, ctx) as number)
    : 0;
  const resource = container.effects?.find(
    (e) =>
      e.type === 'resource' &&
      e.method === 'add' &&
      e.params?.key === Resource.gold,
  ) as { params: { amount: number } } | undefined;
  const amount = resource?.params.amount ?? 0;
  return amount * count;
}

function getMillDevelopmentBonus(ctx: EngineContext) {
  const mill = ctx.buildings.get('mill');
  const mod = mill.onBuild?.find(
    (e) => e.type === 'result_mod' && e.params?.actionId === 'development:farm',
  );
  const resource = mod?.effects?.find(
    (e) =>
      e.type === 'resource' &&
      e.method === 'add' &&
      e.params?.key === Resource.gold,
  ) as { params: { amount: number } } | undefined;
  const amount = resource?.params.amount ?? 0;
  return amount * countFarms(ctx);
}

function getMillOverworkBonus(ctx: EngineContext) {
  const mill = ctx.buildings.get('mill');
  const mod = mill.onBuild?.find(
    (e) => e.type === 'result_mod' && e.params?.actionId === 'overwork',
  );
  const container = mod?.effects?.[0];
  if (!container) return 0;
  const evaluator = container.evaluator;
  const count = evaluator
    ? (EVALUATORS.get(evaluator.type)(evaluator, ctx) as number)
    : 0;
  const resource = container.effects?.find(
    (e) =>
      e.type === 'resource' &&
      e.method === 'add' &&
      e.params?.key === Resource.gold,
  ) as { params: { amount: number } } | undefined;
  const amount = resource?.params.amount ?? 0;
  return amount * count;
}

describe('Mill building', () => {
  it('without mill, development and overwork yield base gold', () => {
    const ctx = createEngine();

    const devBase = getFarmIncome(ctx);
    const beforeDev = ctx.activePlayer.gold;
    runDevelopment(ctx);
    expect(ctx.activePlayer.gold - beforeDev).toBe(devBase);

    const overworkBase = getOverworkBaseGold(ctx);
    const beforeOw = ctx.activePlayer.gold;
    performAction('overwork', ctx);
    expect(ctx.activePlayer.gold - beforeOw).toBe(overworkBase);
  });

  it('grants additional gold during development for each farm until removed', () => {
    const ctx = createEngine();
    runDevelopment(ctx);

    performAction('build', ctx, { id: 'mill' });

    const base = getFarmIncome(ctx);
    const bonus = getMillDevelopmentBonus(ctx);
    const before = ctx.activePlayer.gold;
    runDevelopment(ctx);
    expect(ctx.activePlayer.gold - before).toBe(base + bonus);

    runEffects(
      [{ type: 'building', method: 'remove', params: { id: 'mill' } }],
      ctx,
    );
    const before2 = ctx.activePlayer.gold;
    runDevelopment(ctx);
    expect(ctx.activePlayer.gold - before2).toBe(base);
  });

  it('adds gold when overworking farms until removed', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build', ctx, { id: 'mill' });
    ctx.activePlayer.ap += 1;
    const base = getOverworkBaseGold(ctx);
    const bonus = getMillOverworkBonus(ctx);
    const before = ctx.activePlayer.gold;
    performAction('overwork', ctx);
    expect(ctx.activePlayer.gold - before).toBe(base + bonus);

    runEffects(
      [{ type: 'building', method: 'remove', params: { id: 'mill' } }],
      ctx,
    );
    ctx.activePlayer.ap += 1;
    const before2 = ctx.activePlayer.gold;
    performAction('overwork', ctx);
    expect(ctx.activePlayer.gold - before2).toBe(base);
  });

  it('does not grant bonuses to the opponent', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build', ctx, { id: 'mill' });

    ctx.game.currentPlayerIndex = 1;
    const devBase = getFarmIncome(ctx);
    const beforeDev = ctx.activePlayer.gold;
    runDevelopment(ctx);
    expect(ctx.activePlayer.gold - beforeDev).toBe(devBase);

    const overworkBase = getOverworkBaseGold(ctx);
    const beforeOw = ctx.activePlayer.gold;
    performAction('overwork', ctx);
    expect(ctx.activePlayer.gold - beforeOw).toBe(overworkBase);
  });
});
