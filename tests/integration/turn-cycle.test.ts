import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  runUpkeep,
  performAction,
  Resource,
  Phase,
  POPULATIONS,
  DEVELOPMENTS,
  PopulationRole,
  EngineContext,
} from '../../packages/engine/src/index.ts';

function getCouncilApGain() {
  const effect = POPULATIONS.get(PopulationRole.Council).onDevelopmentPhase?.find(
    e => e.type === 'resource' && e.method === 'add' && e.params?.key === Resource.ap,
  );
  return effect?.params.amount ?? 0;
}

function getFarmGoldGain() {
  const effect = DEVELOPMENTS.get('farm').onDevelopmentPhase?.find(
    e => e.type === 'resource' && e.method === 'add' && e.params?.key === Resource.gold,
  );
  return effect?.params.amount ?? 0;
}

function getCouncilUpkeepCost() {
  const effect = POPULATIONS.get(PopulationRole.Council).onUpkeepPhase?.find(
    e => e.type === 'resource' && e.method === 'remove' && e.params?.key === Resource.gold,
  );
  return effect?.params.amount ?? 0;
}

function getActionCosts(id: string, ctx: EngineContext) {
  const def = ctx.actions.get(id);
  const baseCosts = { ...(def.baseCosts || {}) };
  if (baseCosts[Resource.ap] === undefined) baseCosts[Resource.ap] = ctx.services.rules.defaultActionAPCost;
  return ctx.passives.applyCostMods(def.id, baseCosts, ctx);
}

function getExpandExpectations(ctx: EngineContext) {
  const def = ctx.actions.get('expand');
  const costs = getActionCosts('expand', ctx);
  const landGain = def.effects
    .filter(e => e.type === 'land' && e.method === 'add')
    .reduce((sum, e) => sum + (e.params?.count ?? 0), 0);
  const baseHappiness = def.effects
    .filter(e => e.type === 'resource' && e.method === 'add' && e.params?.key === Resource.happiness)
    .reduce((sum, e) => sum + (e.params?.amount ?? 0), 0);
  const dummyCtx = { activePlayer: { happiness: 0 } } as EngineContext;
  ctx.passives.runResultMods(def.id, dummyCtx);
  const extraHappiness = dummyCtx.activePlayer.happiness;
  return { costs, landGain, happinessGain: baseHappiness + extraHappiness };
}

describe('Turn cycle integration', () => {
  it('processes development, upkeep, and main phases for both players', () => {
    const ctx = createEngine();
    expect(ctx.game.turn).toBe(1);
    expect(ctx.game.currentPhase).toBe(Phase.Development);
    expect(ctx.game.currentPlayerIndex).toBe(0);
    const apGain = getCouncilApGain();
    const farmGold = getFarmGoldGain();
    const upkeepCost = getCouncilUpkeepCost();

    // Player A development
    ctx.game.currentPlayerIndex = 0;
    const startGoldA = ctx.activePlayer.gold;
    const startApA = ctx.activePlayer.ap;
    runDevelopment(ctx);
    expect(ctx.game.currentPhase).toBe(Phase.Development);
    expect(ctx.activePlayer.ap).toBe(startApA + apGain);
    expect(ctx.activePlayer.gold).toBe(startGoldA + farmGold);
    const afterDevGoldA = ctx.activePlayer.gold;

    // Player B development
    ctx.game.currentPlayerIndex = 1;
    const startGoldB = ctx.activePlayer.gold;
    const startApB = ctx.activePlayer.ap;
    runDevelopment(ctx);
    expect(ctx.activePlayer.ap).toBe(startApB + apGain);
    expect(ctx.activePlayer.gold).toBe(startGoldB + farmGold);
    const afterDevGoldB = ctx.activePlayer.gold;

    // Player A upkeep
    ctx.game.currentPlayerIndex = 0;
    runUpkeep(ctx);
    expect(ctx.game.currentPhase).toBe(Phase.Upkeep);
    expect(ctx.activePlayer.gold).toBe(afterDevGoldA - upkeepCost);

    // Player B upkeep
    ctx.game.currentPlayerIndex = 1;
    runUpkeep(ctx);
    expect(ctx.activePlayer.gold).toBe(afterDevGoldB - upkeepCost);

    // Main phase actions
    ctx.game.currentPhase = Phase.Main;

    ctx.game.currentPlayerIndex = 0;
    const expandA = getExpandExpectations(ctx);
    const goldBeforeA = ctx.activePlayer.gold;
    const apBeforeA = ctx.activePlayer.ap;
    const landsBeforeA = ctx.activePlayer.lands.length;
    const hapBeforeA = ctx.activePlayer.happiness;
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(goldBeforeA - (expandA.costs[Resource.gold] || 0));
    expect(ctx.activePlayer.ap).toBe(apBeforeA - (expandA.costs[Resource.ap] || 0));
    expect(ctx.activePlayer.lands.length).toBe(landsBeforeA + expandA.landGain);
    expect(ctx.activePlayer.happiness).toBe(hapBeforeA + expandA.happinessGain);

    ctx.game.currentPlayerIndex = 1;
    const expandB = getExpandExpectations(ctx);
    const goldBeforeB = ctx.activePlayer.gold;
    const apBeforeB = ctx.activePlayer.ap;
    const landsBeforeB = ctx.activePlayer.lands.length;
    const hapBeforeB = ctx.activePlayer.happiness;
    performAction('expand', ctx);
    expect(ctx.activePlayer.gold).toBe(goldBeforeB - (expandB.costs[Resource.gold] || 0));
    expect(ctx.activePlayer.ap).toBe(apBeforeB - (expandB.costs[Resource.ap] || 0));
    expect(ctx.activePlayer.lands.length).toBe(landsBeforeB + expandB.landGain);
    expect(ctx.activePlayer.happiness).toBe(hapBeforeB + expandB.happinessGain);

    // End turn reset
    ctx.game.turn += 1;
    ctx.game.currentPhase = Phase.Development;
    ctx.game.currentPlayerIndex = 0;
    expect(ctx.game.turn).toBe(2);
    expect(ctx.game.currentPhase).toBe(Phase.Development);
    expect(ctx.game.currentPlayerIndex).toBe(0);
  });
});

