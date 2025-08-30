import { describe, it, expect } from 'vitest';
import {
  createEngine,
  advance,
  PopulationRole,
  Resource,
  Stat,
  POPULATIONS,
  createPopulationRegistry,
  PHASES,
} from '../../src';

const council = POPULATIONS.get(PopulationRole.Council);
const councilApGain =
  council.onDevelopmentPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'add' &&
      effect.params.key === Resource.ap,
  )?.params.amount ?? 0;
const councilUpkeep =
  council.onUpkeepPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'remove' &&
      effect.params.key === Resource.gold,
  )?.params.amount ?? 0;

const commander = POPULATIONS.get(PopulationRole.Commander);
const commanderUpkeep =
  commander.onUpkeepPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'remove' &&
      effect.params.key === Resource.gold,
  )?.params.amount ?? 0;
const commanderPct =
  commander.onDevelopmentPhase?.find(
    (effect) =>
      effect.type === 'stat' &&
      effect.method === 'add_pct' &&
      effect.params.key === Stat.armyStrength,
  )?.params.percent ?? 0;

const fortifier = POPULATIONS.get(PopulationRole.Fortifier);
const fortifierUpkeep =
  fortifier.onUpkeepPhase?.find(
    (effect) =>
      effect.type === 'resource' &&
      effect.method === 'remove' &&
      effect.params.key === Resource.gold,
  )?.params.amount ?? 0;
const fortifierPct =
  fortifier.onDevelopmentPhase?.find(
    (effect) =>
      effect.type === 'stat' &&
      effect.method === 'add_pct' &&
      effect.params.key === Stat.fortificationStrength,
  )?.params.percent ?? 0;

function setup({
  gold,
  ap,
  councils,
  commanders = 0,
  fortifiers = 0,
}: {
  gold: number;
  ap: number;
  councils: number;
  commanders?: number;
  fortifiers?: number;
}) {
  const ctx = createEngine();
  // remove starting farm to isolate population effects
  for (const land of ctx.activePlayer.lands) {
    land.developments = [];
    land.slotsUsed = 0;
  }
  ctx.activePlayer.gold = gold;
  ctx.activePlayer.ap = ap;
  ctx.activePlayer.population[PopulationRole.Council] = councils;
  ctx.activePlayer.population[PopulationRole.Commander] = commanders;
  ctx.activePlayer.population[PopulationRole.Fortifier] = fortifiers;
  return ctx;
}

function runDev(ctx: ReturnType<typeof createEngine>) {
  ctx.game.phaseIndex = 0;
  ctx.game.currentPhase = PHASES[0]!.id;
  ctx.game.currentStep = PHASES[0]!.steps[0]!.id;
  ctx.game.currentPlayerIndex = 0;
  advance(ctx);
  ctx.game.currentPlayerIndex = 0;
}

function runUpk(ctx: ReturnType<typeof createEngine>) {
  ctx.game.phaseIndex = 1;
  ctx.game.currentPhase = PHASES[1]!.id;
  ctx.game.currentStep = PHASES[1]!.steps[0]!.id;
  ctx.game.currentPlayerIndex = 0;
  advance(ctx);
  ctx.game.currentPlayerIndex = 0;
}

describe('population development/upkeep triggers', () => {
  it('scenario 1: single council', () => {
    const startGold = 10;
    const startAP = 0;
    const councils = 1;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDev(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpk(ctx);
    const expectedGold = startGold - councilUpkeep * councils;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('scenario 2: starting with 2 AP', () => {
    const startGold = 10;
    const startAP = 2;
    const councils = 1;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDev(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpk(ctx);
    const expectedGold = startGold - councilUpkeep * councils;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('scenario 3: negative AP', () => {
    const startGold = 10;
    const startAP = -1;
    const councils = 1;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDev(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpk(ctx);
    const expectedGold = startGold - councilUpkeep * councils;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('scenario 4: two councils', () => {
    const startGold = 10;
    const startAP = 0;
    const councils = 2;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDev(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpk(ctx);
    const expectedGold = startGold - councilUpkeep * councils;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('scenario 5: cannot pay upkeep', () => {
    const startGold = 0;
    const startAP = 0;
    const councils = 1;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDev(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    ctx.game.phaseIndex = 1;
    ctx.game.currentPhase = PHASES[1]!.id;
    ctx.game.currentStep = PHASES[1]!.steps[0]!.id;
    expect(() => advance(ctx)).toThrow();
  });

  it('scenario 6: mixed roles', () => {
    const startGold = 10;
    const startAP = 0;
    const councils = 1;
    const commanders = 1;
    const fortifiers = 1;
    const ctx = setup({
      gold: startGold,
      ap: startAP,
      councils,
      commanders,
      fortifiers,
    });
    runDev(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpk(ctx);
    const expectedGold =
      startGold -
      councilUpkeep * councils -
      commanderUpkeep * commanders -
      fortifierUpkeep * fortifiers;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('commander respects config', () => {
    const startGold = 10;
    const startArmy = 8;
    const ctx = setup({ gold: startGold, ap: 0, councils: 0, commanders: 1 });
    ctx.activePlayer.armyStrength = startArmy;
    runDev(ctx);
    const expectedArmy = startArmy + startArmy * (commanderPct / 100);
    expect(ctx.activePlayer.armyStrength).toBeCloseTo(expectedArmy);
    runUpk(ctx);
    const expectedGold = startGold - commanderUpkeep;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
  });

  it('fortifier respects config', () => {
    const startGold = 10;
    const startFort = 4;
    const ctx = setup({ gold: startGold, ap: 0, councils: 0, fortifiers: 1 });
    ctx.activePlayer.fortificationStrength = startFort;
    runDev(ctx);
    const expectedFort = startFort + startFort * (fortifierPct / 100);
    expect(ctx.activePlayer.fortificationStrength).toBeCloseTo(expectedFort);
    runUpk(ctx);
    const expectedGold = startGold - fortifierUpkeep;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
  });
});

describe('population registry overrides', () => {
  it('allows councils to swap effects', () => {
    const populations = createPopulationRegistry();
    populations.add(PopulationRole.Council, {
      id: PopulationRole.Council,
      name: 'Council',
      onDevelopmentPhase: [
        {
          type: 'resource',
          method: 'add',
          params: { key: Resource.gold, amount: 2 },
        },
      ],
      onUpkeepPhase: [
        {
          type: 'resource',
          method: 'remove',
          params: { key: Resource.ap, amount: 1 },
        },
      ],
    });

    const ctx = createEngine({ populations });
    for (const land of ctx.activePlayer.lands) {
      land.developments = [];
      land.slotsUsed = 0;
    }
    const startGold = 5;
    const startAP = 1;
    ctx.activePlayer.gold = startGold;
    ctx.activePlayer.ap = startAP;
    ctx.activePlayer.population[PopulationRole.Council] = 1;
    ctx.activePlayer.population[PopulationRole.Commander] = 0;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 0;

    const councilDefinition = populations.get(PopulationRole.Council);
    const devGain = Number(
      councilDefinition.onDevelopmentPhase?.find(
        (effect) =>
          effect.type === 'resource' &&
          effect.method === 'add' &&
          effect.params.key === Resource.gold,
      )?.params.amount ?? 0,
    );
    const upkeepCost = Number(
      councilDefinition.onUpkeepPhase?.find(
        (effect) =>
          effect.type === 'resource' &&
          effect.method === 'remove' &&
          effect.params.key === Resource.ap,
      )?.params.amount ?? 0,
    );

    runDev(ctx);
    expect(ctx.activePlayer.gold).toBe(startGold + devGain);
    expect(ctx.activePlayer.ap).toBe(startAP);
    runUpk(ctx);
    expect(ctx.activePlayer.ap).toBe(startAP - upkeepCost);
    expect(ctx.activePlayer.gold).toBe(startGold + devGain);
  });

  it('allows commanders to swap triggers', () => {
    const populations = createPopulationRegistry();
    populations.add(PopulationRole.Commander, {
      id: PopulationRole.Commander,
      name: 'Army Commander',
      onDevelopmentPhase: [
        {
          type: 'resource',
          method: 'remove',
          params: { key: Resource.gold, amount: 1 },
        },
      ],
      onUpkeepPhase: [
        {
          type: 'stat',
          method: 'add_pct',
          params: { key: Stat.armyStrength, percent: 25 },
        },
      ],
    });

    const ctx = createEngine({ populations });
    for (const land of ctx.activePlayer.lands) {
      land.developments = [];
      land.slotsUsed = 0;
    }
    const startGold = 10;
    const startArmy = 8;
    ctx.activePlayer.gold = startGold;
    ctx.activePlayer.armyStrength = startArmy;
    ctx.activePlayer.population[PopulationRole.Council] = 0;
    ctx.activePlayer.population[PopulationRole.Commander] = 1;

    const commanderDefinition = populations.get(PopulationRole.Commander);
    const devCost =
      commanderDefinition.onDevelopmentPhase?.find(
        (effect) =>
          effect.type === 'resource' &&
          effect.method === 'remove' &&
          effect.params.key === Resource.gold,
      )?.params.amount ?? 0;
    const upkeepPct =
      commanderDefinition.onUpkeepPhase?.find(
        (effect) =>
          effect.type === 'stat' &&
          effect.method === 'add_pct' &&
          effect.params.key === Stat.armyStrength,
      )?.params.percent ?? 0;

    runDev(ctx);
    expect(ctx.activePlayer.gold).toBe(startGold - devCost);
    expect(ctx.activePlayer.armyStrength).toBe(startArmy);
    runUpk(ctx);
    const expectedArmy = startArmy + startArmy * (upkeepPct / 100);
    expect(ctx.activePlayer.armyStrength).toBeCloseTo(expectedArmy);
    expect(ctx.activePlayer.gold).toBe(startGold - devCost);
  });

  it('allows fortifiers to swap triggers', () => {
    const populations = createPopulationRegistry();
    populations.add(PopulationRole.Fortifier, {
      id: PopulationRole.Fortifier,
      name: 'Fortifier',
      onDevelopmentPhase: [
        {
          type: 'resource',
          method: 'remove',
          params: { key: Resource.gold, amount: 1 },
        },
      ],
      onUpkeepPhase: [
        {
          type: 'stat',
          method: 'add_pct',
          params: { key: Stat.fortificationStrength, percent: 25 },
        },
      ],
    });

    const ctx = createEngine({ populations });
    for (const land of ctx.activePlayer.lands) {
      land.developments = [];
      land.slotsUsed = 0;
    }
    const startGold = 10;
    const startFort = 4;
    ctx.activePlayer.gold = startGold;
    ctx.activePlayer.fortificationStrength = startFort;
    ctx.activePlayer.population[PopulationRole.Council] = 0;
    ctx.activePlayer.population[PopulationRole.Fortifier] = 1;

    const fortifierDefinition = populations.get(PopulationRole.Fortifier);
    const devCost =
      fortifierDefinition.onDevelopmentPhase?.find(
        (effect) =>
          effect.type === 'resource' &&
          effect.method === 'remove' &&
          effect.params.key === Resource.gold,
      )?.params.amount ?? 0;
    const upkeepPct =
      fortifierDefinition.onUpkeepPhase?.find(
        (effect) =>
          effect.type === 'stat' &&
          effect.method === 'add_pct' &&
          effect.params.key === Stat.fortificationStrength,
      )?.params.percent ?? 0;

    runDev(ctx);
    expect(ctx.activePlayer.gold).toBe(startGold - devCost);
    runUpk(ctx);
    const expectedFort = startFort + startFort * (upkeepPct / 100);
    expect(ctx.activePlayer.fortificationStrength).toBeCloseTo(expectedFort);
    expect(ctx.activePlayer.gold).toBe(startGold - devCost);
  });
});
