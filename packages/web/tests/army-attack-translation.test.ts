import { describe, it, expect, vi } from 'vitest';
import type { SummaryEntry } from '../src/translation/content';
import {
  summarizeContent,
  describeContent,
  logContent,
} from '../src/translation/content';
import {
  createEngine,
  performAction,
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
  PopulationRole,
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
    const onDamage = attackEffect?.params?.['onDamage'] as {
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
        title: `On opponent ${castle.icon} ${castle.label} damage`,
        items: [
          { title: 'Opponent', items: [`${happiness.icon}${defenderAmt}`] },
          {
            title: 'You',
            items: [
              `${happiness.icon}${attackerAmt >= 0 ? '+' : ''}${attackerAmt}`,
              `${plunder.icon} ${plunder.name}`,
            ],
          },
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
    const youEntry = onDamage.items.find(
      (i) => typeof i === 'object' && (i as { title: string }).title === 'You',
    ) as { items: SummaryEntry[] } | undefined;
    expect(youEntry).toBeDefined();
    const plunderEntry =
      youEntry &&
      youEntry.items.find(
        (i) =>
          typeof i === 'object' &&
          (i as { title: string }).title === `${plunder.icon} ${plunder.name}`,
      );
    expect(plunderEntry).toBeDefined();
    expect(
      plunderEntry &&
        typeof plunderEntry === 'object' &&
        Array.isArray((plunderEntry as { items?: unknown[] }).items) &&
        ((plunderEntry as { items?: unknown[] }).items?.length ?? 0) > 0,
    ).toBeTruthy();
  });

  it('logs army attack action with concrete evaluation', () => {
    const ctx = createCtx();
    const armyAttack = ctx.actions.get('army_attack');
    const castle = RESOURCES[Resource.castleHP];
    const army = STATS[Stat.armyStrength];
    const absorption = STATS[Stat.absorption];
    const fort = STATS[Stat.fortificationStrength];
    const happiness = RESOURCES[Resource.happiness];
    const plunder = ctx.actions.get('plunder');

    ctx.activePlayer.resources[Resource.ap] = 1;
    ctx.activePlayer.population = {
      ...ctx.activePlayer.population,
      [PopulationRole.Legion]: 1,
      [PopulationRole.Council]: 0,
    };
    ctx.activePlayer.stats[Stat.armyStrength] = 2;
    ctx.activePlayer.resources[Resource.happiness] = 1;
    ctx.activePlayer.resources[Resource.gold] = 13;
    ctx.opponent.stats[Stat.fortificationStrength] = 1;
    ctx.opponent.resources[Resource.happiness] = 3;
    ctx.opponent.resources[Resource.gold] = 20;

    performAction('army_attack', ctx);
    const log = logContent('action', 'army_attack', ctx);
    expect(log).toEqual([
      `Played ${armyAttack.icon} ${armyAttack.name}`,
      `  Damage evaluation: ${army.icon}2 vs. ${absorption.icon}0% ${fort.icon}1 ${castle.icon}10`,
      `    ${army.icon}2 vs. ${absorption.icon}0% --> ${army.icon}2`,
      `    ${army.icon}2 vs. ${fort.icon}1 --> ${fort.icon}0 ${army.icon}1`,
      `    ${army.icon}1 vs. ${castle.icon}10 --> ${castle.icon}9`,
      `  ${castle.icon} ${castle.label} damage trigger evaluation`,
      `    Opponent: ${happiness.icon} ${happiness.label} -1 (3→2)`,
      `    You: ${happiness.icon} ${happiness.label} +1 (1→2)`,
      `    Triggered ${plunder.icon} ${plunder.name}`,
      `      Opponent: ${RESOURCES[Resource.gold].icon} ${RESOURCES[Resource.gold].label} -25% (20→15) (-5)`,
      `      You: ${RESOURCES[Resource.gold].icon} ${RESOURCES[Resource.gold].label} +5 (13→18)`,
    ]);
  });
});
