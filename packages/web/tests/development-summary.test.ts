import { describe, it, expect, vi } from 'vitest';
import { summarizeContent } from '../src/translation/content';
import type { Summary } from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
  RESOURCES,
  Resource,
  type StepDef,
} from '@kingdom-builder/contents';

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
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
    });
    const summary = summarizeContent('development', 'farm', ctx);
    const flat = flatten(summary);
    const goldIcon = RESOURCES[Resource.gold].icon;
    const farmIcon = DEVELOPMENTS.get('farm')?.icon || '';
    const growthPhase = ctx.phases.find((p) => p.id === 'growth');
    const gainIncome = growthPhase?.steps.find(
      (s) => s.id === 'gain-income',
    ) as StepDef | undefined;
    const farmEffect = gainIncome?.effects?.find((e) => e.evaluator);
    const inner = farmEffect?.effects?.find((e) => e.type === 'resource');
    const amt = (inner?.params as { amount?: number })?.amount ?? 0;
    expect(flat).toContain(`${goldIcon}+${amt} per ${farmIcon}`);
  });
});
