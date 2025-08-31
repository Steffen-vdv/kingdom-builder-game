import { describe, it, expect, vi } from 'vitest';
import {
  summarizeContent,
  describeContent,
  splitSummary,
} from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
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

describe('plow action translation', () => {
  it('summarizes plow action', () => {
    const ctx = createCtx();
    const summary = summarizeContent('action', 'plow', ctx);
    expect(summary).toEqual([
      '🌱 Expand',
      '🧑‍🌾 Till',
      { title: '♾️ Until your next Upkeep Phase', items: ['💲: 🪙+2'] },
    ]);
  });

  it('describes plow action without perform prefix and with passive icon', () => {
    const ctx = createCtx();
    const desc = describeContent('action', 'plow', ctx);
    const titles = desc.map((d) => (typeof d === 'string' ? d : d.title));
    titles.forEach((t) => expect(t).not.toMatch(/^Perform action/));
    const passive = desc.find(
      (d) => typeof d === 'object' && d.title.includes('Upkeep Phase'),
    ) as { title: string; items?: unknown[] } | undefined;
    expect(passive?.title.startsWith('♾️ ')).toBe(true);
  });

  it('keeps performed system actions in effects', () => {
    const ctx = createCtx();
    const summary = describeContent('action', 'plow', ctx);
    const { effects, description } = splitSummary(summary);
    expect(description).toBeUndefined();
    expect(effects).toEqual([
      { title: '🌱 Expand', items: ['Gain 1 🗺️ Land', '😊+1 Happiness'] },
      { title: '🧑‍🌾 Till', items: ['Till 🗺️ to unlock 🧩 slot'] },
      {
        title: '♾️ Before your next Upkeep Phase',
        items: ['💲 Cost Modifier on all actions: Increase cost by 🪙2'],
      },
    ]);
  });
});
