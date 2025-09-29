import { describe, it, expect, vi } from 'vitest';
import { createEngine, runEffects, advance } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
  PopulationRole,
  Stat,
} from '@kingdom-builder/contents';
import { getStatBreakdownSummary } from '../src/utils/stats';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

describe('stat breakdown summary', () => {
  it('includes ongoing and permanent army strength sources', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
    });

    runEffects(
      [
        {
          type: 'population',
          method: 'add',
          params: { role: PopulationRole.Legion },
        },
      ],
      ctx,
    );

    const raiseStrengthPhase = ctx.phases.find((phase) =>
      phase.steps.some((step) => step.id === 'raise-strength'),
    );
    expect(raiseStrengthPhase).toBeDefined();
    let result;
    do {
      result = advance(ctx);
    } while (
      result.phase !== raiseStrengthPhase!.id ||
      result.step !== 'raise-strength'
    );

    const breakdown = getStatBreakdownSummary(
      Stat.armyStrength,
      ctx.activePlayer,
      ctx,
    );
    expect(breakdown.length).toBeGreaterThanOrEqual(2);
    const ongoing = breakdown.find((line) => line.includes('ongoing'));
    const permanent = breakdown.find((line) => line.includes('permanent'));
    expect(ongoing).toBeTruthy();
    expect(ongoing).toMatch(/Legion/);
    expect(permanent).toBeTruthy();
    expect(permanent).toMatch(/Raise Strength/);
  });
});
