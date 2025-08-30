import { describe, it, expect, vi } from 'vitest';
import { summarizeContent } from '../src/translation/content';
import type { Summary } from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

function flatten(summary: Summary): string[] {
  const result: string[] = [];
  for (const entry of summary) {
    if (typeof entry === 'string') {
      result.push(entry);
    } else {
      result.push(...flatten(entry.items));
    }
  }
  return result;
}

describe('development translation', () => {
  it('includes phase effects for farm', () => {
    const ctx = createEngine();
    const summary = summarizeContent('development', 'farm', ctx);
    const flat = flatten(summary);
    expect(flat).toContain('🪙+2 per 🌾');
  });
});
