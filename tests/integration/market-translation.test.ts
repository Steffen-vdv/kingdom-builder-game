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

describe('Market building translation', () => {
  it('mentions tax bonus', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const summary = summarizeContent('building', 'market', ctx) as unknown;
    expect(JSON.stringify(summary)).toContain('Tax');
  });
});
