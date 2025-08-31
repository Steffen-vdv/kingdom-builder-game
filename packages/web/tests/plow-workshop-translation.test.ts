import { describe, it, expect, vi } from 'vitest';
import { describeContent } from '../src/translation/content';
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

describe('plow workshop translation', () => {
  it('includes action card and omits Immediately', () => {
    const ctx = createCtx();
    const summary = describeContent('building', 'plow_workshop', ctx);
    expect(summary).toHaveLength(2);
    const build = summary[0] as { title: string; items?: unknown[] };
    expect(build.items?.[0]).toBe('Gain action 🚜 Plow');
    const actionCard = summary[1] as { title: string };
    expect(actionCard.title).toBe('🚜 Plow');
    expect(JSON.stringify(summary)).not.toMatch(/Immediately|🎯/);
  });
});
