import { describe, it, expect, vi } from 'vitest';
import { summarizeContent, describeContent } from '../src/translation/content';
import { createEngine, type EffectDef } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
  RESOURCES,
  STATS,
  Resource,
  Stat,
  MODIFIER_INFO,
} from '@kingdom-builder/contents';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

function createCtx() {
  return createEngine({
    actions: ACTIONS,
    buildings: BUILDINGS,
    developments: DEVELOPMENTS,
    populations: POPULATIONS,
    phases: PHASES,
    start: GAME_START,
    rules: RULES,
  });
}

describe('hold festival translation', () => {
  it('summarizes and describes hold festival', () => {
    const ctx = createCtx();
    const summary = summarizeContent('action', 'hold_festival', ctx);
    const desc = describeContent('action', 'hold_festival', ctx);
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

    const hapInfo = RESOURCES[Resource.happiness];
    const fortInfo = STATS[Stat.fortificationStrength];
    const army = ctx.actions.get('army_attack');
    const modInfo = MODIFIER_INFO.result;

    expect(summary).toEqual([
      `${hapInfo.icon}+${hapAmt}`,
      `${fortInfo.icon}${fortAmt}`,
      {
        title: '♾️ Until next Upkeep',
        items: [`${modInfo.icon} ${army.icon}: ${hapInfo.icon}${penaltyAmt}`],
      },
    ]);

    expect(desc).toEqual([
      `${hapInfo.icon}+${hapAmt} ${hapInfo.label}`,
      `Lose ${Math.abs(fortAmt)} ${fortInfo.icon} ${fortInfo.label}`,
      {
        title: '♾️ Until your next Upkeep Phase',
        items: [
          `${modInfo.icon} ${modInfo.label} on ${army.icon} ${army.name}: ${hapInfo.icon}${penaltyAmt} ${hapInfo.label}`,
        ],
      },
    ]);
  });
});
