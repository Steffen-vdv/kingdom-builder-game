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

describe('Tax action translation', () => {
  it('mentions population scaling', () => {
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
    const summary = summarizeContent('action', 'tax', ctx) as (
      | string
      | { title: string; items: unknown[] }
    )[];
    const lines = summary.filter((i): i is string => typeof i === 'string');
    expect(lines.some((i) => i.includes('per 👥'))).toBe(true);
  });
});
