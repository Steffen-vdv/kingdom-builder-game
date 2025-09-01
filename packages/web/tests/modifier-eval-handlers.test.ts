import { describe, it, expect, vi } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { registerModifierEvalHandler } from '../src/translation/effects/formatters/modifier';
import { createEngine } from '@kingdom-builder/engine';
import type { EffectDef } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
} from '@kingdom-builder/contents';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

function createCtx() {
  return createEngine({
    actions: ACTIONS,
    buildings: BUILDINGS,
    developments: DEVELOPMENTS,
    populations: POPULATIONS,
    phases: PHASES,
    start: GAME_START,
    rules: RULES,
  });
}

describe('modifier evaluation handlers', () => {
  it('allows registering custom evaluation formatters', () => {
    const ctx = createCtx();
    registerModifierEvalHandler('test_eval', {
      summarize: () => ['handled'],
      describe: () => ['handled desc'],
    });
    const eff: EffectDef = {
      type: 'result_mod',
      method: 'add',
      params: { evaluation: { type: 'test_eval', id: 'x' } },
    };
    const summary = summarizeEffects([eff], ctx);
    const description = describeEffects([eff], ctx);
    expect(summary).toContain('handled');
    expect(description).toContain('handled desc');
  });
});
