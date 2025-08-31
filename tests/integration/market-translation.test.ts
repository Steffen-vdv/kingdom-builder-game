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

describe('Market building translation', () => {
  it('mentions population and tax', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const summary = summarizeContent('building', 'market', ctx) as unknown;
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
    expect(
      lines.some(
        (l) => l.includes('👥 Population through') && l.includes('Tax'),
      ),
    ).toBe(true);
  });
});
