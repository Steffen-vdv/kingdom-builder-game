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
    const absorption = STATS[Stat.absorption];
    const fort = STATS[Stat.fortificationStrength];
    const happiness = RESOURCES[Resource.happiness];
    const plunder = ctx.actions.get('plunder');
    const warWeariness = STATS[Stat.warWeariness];
    const summary = summarizeContent('action', 'army_attack', ctx);
    expect(summary).toEqual([
      {
        title: `Attack opponent with your ${army.icon} ${army.label}`,
        items: [
          `${absorption.icon} reduces damage`,
          `Hits opponent's ${fort.icon} then ${castle.icon}`,
        ],
      },
      {
        title: `On opponent ${castle.icon} ${castle.label} damage`,
        items: [
          `${happiness.icon}+1 for you`,
          `${happiness.icon}-1 for opponent`,
          `${plunder.icon} ${plunder.name}`,
        ],
      },
      `${warWeariness.icon}+1`,
    ]);
  });
});
