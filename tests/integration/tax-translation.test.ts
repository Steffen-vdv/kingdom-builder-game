import { describe, it, expect, vi } from 'vitest';
vi.mock(
  '@kingdom-builder/engine',
  async () => import('../../packages/engine/src'),
);
import { createEngine } from '../../packages/engine/src';
import { summarizeContent } from '../../packages/web/src/translation/content';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
} from '../../packages/contents/src';

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
    const summary = summarizeContent('action', 'tax', ctx) as {
      title: string;
      items: string[];
    }[];
    const items = summary[0]?.items || [];
    expect(items.some((i) => i.includes('per 👥'))).toBe(true);
  });
});
