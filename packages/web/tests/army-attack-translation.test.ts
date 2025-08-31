import { describe, it, expect, vi } from 'vitest';
import type { SummaryEntry } from '../src/translation/content';
import { summarizeContent, describeContent } from '../src/translation/content';
import { createEngine, Resource, Stat } from '@kingdom-builder/engine';
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
    const summary = summarizeContent('action', 'army_attack', ctx);
    expect(summary).toEqual([
      `${army.icon} opponent's ${fort.icon}${castle.icon}`,
      {
        title: `On opponent ${castle.icon} damage`,
        items: [
          `${happiness.icon}-1 for opponent`,
          `${happiness.icon}+1 for you`,
          `${plunder.icon} ${plunder.name}`,
        ],
      },
      `${warWeariness.icon}+1`,
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
