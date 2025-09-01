import { describe, it, expect } from 'vitest';
import {
  performAction,
  getActionRequirements,
  advance,
  runEffects,
  type EffectDef,
} from '../../src';
import { PopulationRole, Resource, Stat } from '../../src/state';
import { createTestEngine } from '../helpers';

describe('Hold Festival action', () => {
  it('requires zero war weariness', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    ctx.activePlayer.warWeariness = 1;
    const failures = getActionRequirements('hold_festival', ctx);
    expect(failures).toHaveLength(1);
    expect(() => performAction('hold_festival', ctx)).toThrow();
  });

  it('boosts happiness, lowers fortification and penalizes next army attack', () => {
    const ctx = createTestEngine();
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const def = ctx.actions.get('hold_festival');
    const hapEff = def.effects.find(
      (e: EffectDef) =>
        e.type === 'resource' &&
        (e.params as { key?: string }).key === Resource.happiness,
    );
    const hapAmt = (hapEff?.params as { amount?: number })?.amount ?? 0;
    const fortEff = def.effects.find(
      (e: EffectDef) =>
        e.type === 'stat' &&
        (e.params as { key?: string }).key === Stat.fortificationStrength,
    );
    const fortAmt = (fortEff?.params as { amount?: number })?.amount ?? 0;
    const passive = def.effects.find((e: EffectDef) => e.type === 'passive');
    const resMod = passive?.effects?.find(
      (e: EffectDef) => e.type === 'result_mod',
    );
    const penaltyRes = resMod?.effects?.find(
      (e: EffectDef) => e.type === 'resource',
    );
    const penaltyAmt = (penaltyRes?.params as { amount?: number })?.amount ?? 0;

    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    ctx.activePlayer.resources[Resource.ap] = 1;
    ctx.activePlayer.resources[Resource.gold] = 3;

    performAction('hold_festival', ctx);
    expect(ctx.activePlayer.resources[Resource.happiness]).toBe(hapAmt);
    expect(ctx.activePlayer.stats[Stat.fortificationStrength]).toBe(fortAmt);

    ctx.activePlayer.resources[Resource.ap] = 1;
    const before = ctx.activePlayer.resources[Resource.happiness];
    performAction('army_attack', ctx);
    expect(ctx.activePlayer.resources[Resource.happiness]).toBe(
      before + penaltyAmt,
    );

    const passiveInst = ctx.passives
      .values(ctx.activePlayer.id)
      .find((p) => p.id === 'hold_festival_attack_mod');
    if (passiveInst?.onUpkeepPhase) runEffects(passiveInst.onUpkeepPhase, ctx);
    ctx.activePlayer.warWeariness = 0;
    ctx.activePlayer.resources[Resource.ap] = 1;
    const before2 = ctx.activePlayer.resources[Resource.happiness];
    performAction('army_attack', ctx);
    expect(ctx.activePlayer.resources[Resource.happiness]).toBe(before2);
  });
});
