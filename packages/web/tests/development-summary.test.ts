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
  it('includes phase effects for a development', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
    });
    const phase = ctx.phases.find((p) =>
      p.steps.some((s: StepDef) =>
        s.effects?.some((e) => e.evaluator?.type === 'development'),
      ),
    );
    const step = phase?.steps.find((s: StepDef) =>
      s.effects?.some((e) => e.evaluator?.type === 'development'),
    ) as StepDef | undefined;
    const devEffect = step?.effects?.find((e) => e.evaluator);
    const devId = devEffect?.evaluator?.params?.['id'] as string;
    const summary = summarizeContent('development', devId, ctx);
    const flat = flatten(summary);
    const goldIcon = RESOURCES[Resource.gold].icon;
    const dev = DEVELOPMENTS.get(devId);
    const devIcon = dev?.icon || '';
    const devLabel = dev?.name || devId;
    const inner = devEffect?.effects?.find((e) => e.type === 'resource');
    const amt = (inner?.params as { amount?: number })?.amount ?? 0;
    expect(flat).toContain(
      `${goldIcon}+${amt} per ${devIcon} ${devLabel}`.trim(),
    );
  });
});
