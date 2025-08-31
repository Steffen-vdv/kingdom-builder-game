import { describe, it, expect, vi } from 'vitest';
import {
  describeContent,
  splitSummary,
  type Summary,
} from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
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

describe('raiders guild translation', () => {
  it('describes plunder action', () => {
    const ctx = createCtx();
    const summary = describeContent('building', 'raiders_guild', ctx);
    const { effects, description } = splitSummary(summary);
    expect(effects).toHaveLength(1);
    const build = effects[0] as { title: string; items?: unknown[] };
    expect(build.items?.[0]).toBe(
      '✨ Result Modifier on 🏴‍☠️ Plunder: Increase transfer by 25%',
    );
    expect(description).toBeDefined();
    const actionCard = (description as Summary)[0] as { title: string };
    expect(actionCard.title).toBe('🏴‍☠️ Plunder');
    expect(JSON.stringify({ effects, description })).not.toMatch(
      /Immediately|🎯/,
    );
  });
});
