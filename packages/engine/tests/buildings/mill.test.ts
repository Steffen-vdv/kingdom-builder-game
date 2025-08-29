import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  Resource,
  EVALUATORS,
} from '../../src/index.ts';
import type { EngineContext } from '../../src/index.ts';
import type { EffectDef } from '../../src/effects/index.ts';

function getFarmCount(ctx: EngineContext) {
  const evaluator = { type: 'development', params: { id: 'farm' } };
  return EVALUATORS.get('development')(evaluator, ctx) as number;
}

function getFarmIncome(ctx: EngineContext) {
  const farmDef = ctx.developments.get('farm');
  const effect = (farmDef.onDevelopmentPhase || []).find(
    (e) => e.type === 'resource',
  ) as EffectDef;
  return (effect.params?.amount as number) || 0;
}

function getMillBonus(ctx: EngineContext, actionId: string) {
  const millDef = ctx.buildings.get('mill');
  const passive = (millDef.onBuild || []).find(
    (e) => e.type === 'passive',
  ) as EffectDef;
  const mod = (passive.effects || []).find(
    (e) =>
      e.params && (e.params as { actionId?: string }).actionId === actionId,
  ) as EffectDef;
  const container = (mod.effects || [])[0] as EffectDef;
  const resourceEffect = (container.effects || []).find(
    (e) => e.type === 'resource',
  ) as EffectDef;
  return (resourceEffect.params?.amount as number) || 0;
}

describe('Mill building', () => {
  it('adds bonus gold to farms during development phase', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build', ctx, { id: 'mill' });

    const goldBefore = ctx.activePlayer.gold;
    const farmCount = getFarmCount(ctx);
    const baseIncome = getFarmIncome(ctx);
    const bonus = getMillBonus(ctx, 'development_phase');

    runDevelopment(ctx);
    expect(ctx.activePlayer.gold).toBe(
      goldBefore + farmCount * (baseIncome + bonus),
    );
  });

  it('applies bonus even when running development for a non-active player', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build', ctx, { id: 'mill' });

    const playerA = ctx.game.players[0];
    const farmCount = getFarmCount(ctx);
    const baseIncome = getFarmIncome(ctx);
    const bonus = getMillBonus(ctx, 'development_phase');
    const goldBefore = playerA.gold;

    // switch active player to opponent but resolve development for playerA
    ctx.game.currentPlayerIndex = 1;
    runDevelopment(ctx, playerA);

    expect(playerA.gold).toBe(goldBefore + farmCount * (baseIncome + bonus));
  });

  it('adds bonus gold when using Overwork', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build', ctx, { id: 'mill' });
    runDevelopment(ctx);

    const goldBefore = ctx.activePlayer.gold;
    const farmCount = getFarmCount(ctx);

    const actionDef = ctx.actions.get('overwork');
    const container = actionDef.effects[0] as EffectDef;
    const goldEffect = (container.effects || []).find(
      (e) => e.params && (e.params as { key?: Resource }).key === Resource.gold,
    ) as EffectDef & { round?: 'up' | 'down' };
    let base = (goldEffect.params?.amount as number) || 0;
    if (goldEffect.round === 'up') base = Math.ceil(base);
    else if (goldEffect.round === 'down') base = Math.floor(base);

    const bonus = getMillBonus(ctx, 'overwork');

    performAction('overwork', ctx);
    expect(ctx.activePlayer.gold).toBe(goldBefore + farmCount * (base + bonus));
  });

  it('does not grant bonuses to the opponent', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction('build', ctx, { id: 'mill' });

    // switch to opponent
    ctx.game.currentPlayerIndex = 1;

    const goldBefore = ctx.activePlayer.gold;
    const farmCount = getFarmCount(ctx);
    const baseIncome = getFarmIncome(ctx);

    runDevelopment(ctx);
    expect(ctx.activePlayer.gold).toBe(goldBefore + farmCount * baseIncome);

    const goldBeforeOverwork = ctx.activePlayer.gold;

    const actionDef = ctx.actions.get('overwork');
    const container = actionDef.effects[0] as EffectDef;
    const goldEffect = (container.effects || []).find(
      (e) => e.params && (e.params as { key?: Resource }).key === Resource.gold,
    ) as EffectDef & { round?: 'up' | 'down' };
    let base = (goldEffect.params?.amount as number) || 0;
    if (goldEffect.round === 'up') base = Math.ceil(base);
    else if (goldEffect.round === 'down') base = Math.floor(base);

    performAction('overwork', ctx);
    expect(ctx.activePlayer.gold).toBe(goldBeforeOverwork + farmCount * base);
  });
});
