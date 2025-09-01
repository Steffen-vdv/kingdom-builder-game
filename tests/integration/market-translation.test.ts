import { describe, it, expect } from 'vitest';
import { createEngine } from '@kingdom-builder/engine';
import { summarizeContent } from '@kingdom-builder/web/translation/content';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
} from '@kingdom-builder/contents';
import { getBuildingWithPopulationBonus } from './fixtures';

describe('Building translation with population bonus', () => {
  it('mentions population and related action', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
    });
    const { buildingId, actionId } = getBuildingWithPopulationBonus();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const summary = summarizeContent('building', buildingId, ctx) as unknown;
    function flatten(items: unknown[]): string[] {
      return items.flatMap((i) =>
        typeof i === 'string'
          ? [i]
          : Array.isArray((i as { items?: unknown[] }).items)
            ? flatten((i as { items: unknown[] }).items)
            : [],
      );
    }
    const lines = flatten(summary as unknown[]);
    const actionName = ctx.actions.get(actionId)?.name || '';
    expect(
      lines.some(
        (l) => l.includes('Population through') && l.includes(actionName),
      ),
    ).toBe(true);
  });
});
