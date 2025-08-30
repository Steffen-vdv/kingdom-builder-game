import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../../packages/engine/src';

vi.mock(
  '@kingdom-builder/engine',
  async () => await import('../../packages/engine/src'),
);

import { summarizeContent } from '../../packages/web/src/translation/content';

describe('Tax action translation', () => {
  it('mentions population scaling', () => {
    const ctx = createEngine();
    const summary = summarizeContent('action', 'tax', ctx) as {
      title: string;
      items: string[];
    }[];
    const items = summary[0]?.items || [];
    expect(items.some((i) => i.includes('per 👥'))).toBe(true);
  });
});
