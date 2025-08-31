import { describe, it, expect, vi } from 'vitest';
import { summarizeEffects } from '../src/translation/effects';
import { summarizeContent } from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  SLOT_ICON as slotIcon,
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

describe('land till formatter', () => {
  it('summarizes till effect', () => {
    const ctx = createCtx();
    const summary = summarizeEffects([{ type: 'land', method: 'till' }], ctx);
    expect(summary).toContain(`${slotIcon}+1`);
  });

  it('summarizes till action', () => {
    const ctx = createCtx();
    const summary = summarizeContent('action', 'till', ctx) as {
      title: string;
      items: string[];
    }[];
    const items = summary[0]?.items || [];
    expect(items.some((i) => i.includes(slotIcon))).toBe(true);
  });

  it('summarizes plow action', () => {
    const ctx = createCtx();
    const summary = summarizeContent('action', 'plow', ctx);
    expect(summary.length).toBeGreaterThan(0);
  });
});
