import { describe, it, expect, vi } from 'vitest';
import type { SummaryEntry } from '../src/translation/content';
import { summarizeContent, describeContent } from '../src/translation/content';
import {
  createEngine,
  Resource,
  Stat,
  type EffectDef,
} from '@kingdom-builder/engine';
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

describe('army attack translation', () => {
  it('summarizes attack action with on-damage effects', () => {
    const ctx = createCtx();
    const castle = RESOURCES[Resource.castleHP];
    const army = STATS[Stat.armyStrength];
    const fort = STATS[Stat.fortificationStrength];
    const happiness = RESOURCES[Resource.happiness];
    const plunder = ctx.actions.get('plunder');
    const warWeariness = STATS[Stat.warWeariness];
    const armyAttack = ctx.actions.get('army_attack');
    const attackEffect = armyAttack.effects.find(
      (e: EffectDef) => e.type === 'attack',
    );
    const onDamage = attackEffect?.params?.['onCastleDamage'] as {
      attacker: EffectDef[];
      defender: EffectDef[];
    };
    const attackerRes = onDamage?.attacker.find(
      (e: EffectDef) =>
        e.type === 'resource' &&
        (e.params as { key?: string }).key === Resource.happiness,
    );
    const defenderRes = onDamage?.defender.find(
      (e: EffectDef) =>
        e.type === 'resource' &&
        (e.params as { key?: string }).key === Resource.happiness,
    );
    const attackerAmt =
      (attackerRes?.params as { amount?: number })?.amount ?? 0;
    const defenderAmt =
      (defenderRes?.params as { amount?: number })?.amount ?? 0;
    const warRes = armyAttack.effects.find(
      (e: EffectDef) =>
        e.type === 'stat' &&
        (e.params as { key?: string }).key === Stat.warWeariness,
    );
    const warAmt = (warRes?.params as { amount?: number })?.amount ?? 0;
    const summary = summarizeContent('action', 'army_attack', ctx);
    expect(summary).toEqual([
      `${army.icon} opponent's ${fort.icon}${castle.icon}`,
      {
        title: `On opponent ${castle.icon} damage`,
        items: [
          `${happiness.icon}${defenderAmt} for opponent`,
          `${happiness.icon}${attackerAmt >= 0 ? '+' : ''}${attackerAmt} for you`,
          `${plunder.icon} ${plunder.name}`,
        ],
      },
      `${warWeariness.icon}${warAmt >= 0 ? '+' : ''}${warAmt}`,
    ]);
  });

  it('describes plunder effects under on-damage entry', () => {
    const ctx = createCtx();
    const plunder = ctx.actions.get('plunder');
    const desc = describeContent('action', 'army_attack', ctx);
    const onDamage = desc.find(
      (e) =>
        typeof e === 'object' &&
        'title' in e &&
        e.title.startsWith('On opponent'),
    ) as { items: SummaryEntry[] };
    const plunderEntry = onDamage.items.find(
      (i) =>
        typeof i === 'object' &&
        (i as { title: string }).title === `${plunder.icon} ${plunder.name}`,
    ) as { items: unknown[] } | undefined;
    expect(plunderEntry).toBeDefined();
    expect(
      plunderEntry &&
        Array.isArray(plunderEntry.items) &&
        plunderEntry.items.length > 0,
    ).toBeTruthy();
  });
});
