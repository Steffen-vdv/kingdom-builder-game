import { describe, it, expect, vi } from 'vitest';
import { summarizeContent } from '../src/translation/content';
import { createEngine, Resource, Stat } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
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
  });
}

describe('army attack translation', () => {
  it('summarizes attack action with on-damage effects', () => {
    const ctx = createCtx();
    const castle = RESOURCES[Resource.castleHP];
    const army = STATS[Stat.armyStrength];
    const happiness = RESOURCES[Resource.happiness];
    const plunder = ctx.actions.get('plunder');
    const warWeariness = STATS[Stat.warWeariness];
    const summary = summarizeContent('action', 'army_attack', ctx);
    expect(summary).toEqual([
      `Attack opponent's ${castle.icon} ${castle.label} with your ${army.icon} ${army.label}`,
      {
        title: `On ${castle.icon} ${castle.label} damage (you)`,
        items: [`${happiness.icon}+1`, `${plunder.icon} ${plunder.name}`],
      },
      {
        title: `On ${castle.icon} ${castle.label} damage (opponent)`,
        items: [`${happiness.icon}-1`],
      },
      `${warWeariness.icon}+1`,
    ]);
  });
});
