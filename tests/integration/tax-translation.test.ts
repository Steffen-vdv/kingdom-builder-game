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
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const summary = summarizeContent('action', 'tax', ctx) as {
      title: string;
      items: string[];
    }[];
    const items = summary[0]?.items || [];
    expect(items.some((i) => i.includes('per 👥'))).toBe(true);
  });
});
