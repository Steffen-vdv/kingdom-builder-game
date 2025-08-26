import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  runUpkeep,
  PopulationRole,
  Resource,
  Stat,
  POPULATIONS,
  createPopulationRegistry,
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

const council = POPULATIONS.get(PopulationRole.Council)!;
const councilApGain = effectValue(
  council.onDevelopmentPhase,
  (e) => e.type === 'add_resource' && e.params?.key === Resource.ap,
  'amount',
);
const councilUpkeep = effectValue(
  council.onUpkeepPhase,
  (e) => e.type === 'pay_resource' && e.params?.key === Resource.gold,
  'amount',
);

const commander = POPULATIONS.get(PopulationRole.Commander)!;
const commanderUpkeep = effectValue(
  commander.onUpkeepPhase,
  (e) => e.type === 'pay_resource' && e.params?.key === Resource.gold,
  'amount',
);
const commanderPct = effectValue(
  commander.onDevelopmentPhase,
  (e) => e.type === 'add_stat_pct' && e.params?.key === Stat.armyStrength,
  'percent',
);

const fortifier = POPULATIONS.get(PopulationRole.Fortifier)!;
const fortifierUpkeep = effectValue(
  fortifier.onUpkeepPhase,
  (e) => e.type === 'pay_resource' && e.params?.key === Resource.gold,
  'amount',
);
const fortifierPct = effectValue(
  fortifier.onDevelopmentPhase,
  (e) =>
    e.type === 'add_stat_pct' &&
    e.params?.key === Stat.fortificationStrength,
  'percent',
);

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

describe('population development/upkeep triggers', () => {
  it('scenario 1: single council', () => {
    const startGold = 10;
    const startAP = 0;
    const councils = 1;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDevelopment(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpkeep(ctx);
    const expectedGold = startGold - councilUpkeep * councils;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('scenario 2: starting with 2 AP', () => {
    const startGold = 10;
    const startAP = 2;
    const councils = 1;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDevelopment(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpkeep(ctx);
    const expectedGold = startGold - councilUpkeep * councils;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('scenario 3: negative AP', () => {
    const startGold = 10;
    const startAP = -1;
    const councils = 1;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDevelopment(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpkeep(ctx);
    const expectedGold = startGold - councilUpkeep * councils;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('scenario 4: two councils', () => {
    const startGold = 10;
    const startAP = 0;
    const councils = 2;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDevelopment(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpkeep(ctx);
    const expectedGold = startGold - councilUpkeep * councils;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
    expect(ctx.activePlayer.ap).toBe(expectedAp);
  });

  it('scenario 5: cannot pay upkeep', () => {
    const startGold = 0;
    const startAP = 0;
    const councils = 1;
    const ctx = setup({ gold: startGold, ap: startAP, councils });
    runDevelopment(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    expect(() => runUpkeep(ctx)).toThrow();
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
    runDevelopment(ctx);
    const expectedAp = startAP + councilApGain * councils;
    expect(ctx.activePlayer.ap).toBe(expectedAp);
    expect(ctx.activePlayer.gold).toBe(startGold);
    runUpkeep(ctx);
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
    runDevelopment(ctx);
    const expectedArmy = startArmy + startArmy * (commanderPct / 100);
    expect(ctx.activePlayer.armyStrength).toBeCloseTo(expectedArmy);
    runUpkeep(ctx);
    const expectedGold = startGold - commanderUpkeep;
    expect(ctx.activePlayer.gold).toBe(expectedGold);
  });

  it('fortifier respects config', () => {
    const startGold = 10;
    const startFort = 4;
    const ctx = setup({ gold: startGold, ap: 0, councils: 0, fortifiers: 1 });
    ctx.activePlayer.fortificationStrength = startFort;
    runDevelopment(ctx);
    const expectedFort = startFort + startFort * (fortifierPct / 100);
    expect(ctx.activePlayer.fortificationStrength).toBeCloseTo(expectedFort);
    runUpkeep(ctx);
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
        { type: 'add_resource', params: { key: Resource.gold, amount: 2 } },
      ],
      onUpkeepPhase: [
        { type: 'pay_resource', params: { key: Resource.ap, amount: 1 } },
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

    const council = populations.get(PopulationRole.Council)!;
    const devGain = effectValue(
      council.onDevelopmentPhase,
      (e) => e.type === 'add_resource' && e.params?.key === Resource.gold,
      'amount',
    );
    const upkeepCost = effectValue(
      council.onUpkeepPhase,
      (e) => e.type === 'pay_resource' && e.params?.key === Resource.ap,
      'amount',
    );

    runDevelopment(ctx);
    expect(ctx.activePlayer.gold).toBe(startGold + devGain);
    expect(ctx.activePlayer.ap).toBe(startAP);
    runUpkeep(ctx);
    expect(ctx.activePlayer.ap).toBe(startAP - upkeepCost);
    expect(ctx.activePlayer.gold).toBe(startGold + devGain);
  });

  it('allows commanders to swap triggers', () => {
    const populations = createPopulationRegistry();
    populations.add(PopulationRole.Commander, {
      id: PopulationRole.Commander,
      name: 'Army Commander',
      onDevelopmentPhase: [
        { type: 'pay_resource', params: { key: Resource.gold, amount: 1 } },
      ],
      onUpkeepPhase: [
        {
          type: 'add_stat_pct',
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

    const commander = populations.get(PopulationRole.Commander)!;
    const devCost = effectValue(
      commander.onDevelopmentPhase,
      (e) => e.type === 'pay_resource' && e.params?.key === Resource.gold,
      'amount',
    );
    const upkeepPct = effectValue(
      commander.onUpkeepPhase,
      (e) =>
        e.type === 'add_stat_pct' && e.params?.key === Stat.armyStrength,
      'percent',
    );

    runDevelopment(ctx);
    expect(ctx.activePlayer.gold).toBe(startGold - devCost);
    expect(ctx.activePlayer.armyStrength).toBe(startArmy);
    runUpkeep(ctx);
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
        { type: 'pay_resource', params: { key: Resource.gold, amount: 1 } },
      ],
      onUpkeepPhase: [
        {
          type: 'add_stat_pct',
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

    const fortifier = populations.get(PopulationRole.Fortifier)!;
    const devCost = effectValue(
      fortifier.onDevelopmentPhase,
      (e) => e.type === 'pay_resource' && e.params?.key === Resource.gold,
      'amount',
    );
    const upkeepPct = effectValue(
      fortifier.onUpkeepPhase,
      (e) =>
        e.type === 'add_stat_pct' &&
        e.params?.key === Stat.fortificationStrength,
      'percent',
    );

    runDevelopment(ctx);
    expect(ctx.activePlayer.gold).toBe(startGold - devCost);
    runUpkeep(ctx);
    const expectedFort = startFort + startFort * (upkeepPct / 100);
    expect(ctx.activePlayer.fortificationStrength).toBeCloseTo(expectedFort);
    expect(ctx.activePlayer.gold).toBe(startGold - devCost);
  });
});

