import { describe, it, expect } from 'vitest';
import { createEngine } from '../../packages/engine/src';
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
