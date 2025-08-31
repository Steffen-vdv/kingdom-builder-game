import { describe, it, expect, vi } from 'vitest';
import {
  summarizeContent,
  summarizeEffects,
  describeEffects,
  type Summary,
} from '../src/translation';
import { createEngine, PopulationRole } from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  POPULATION_ROLES,
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

describe('population effect translation', () => {
  const ctx = createEngine({
    actions: ACTIONS,
    buildings: BUILDINGS,
    developments: DEVELOPMENTS,
    populations: POPULATIONS,
    phases: PHASES,
    start: GAME_START,
  });

  it('summarizes raise_pop action for specific role', () => {
    const summary = summarizeContent('action', 'raise_pop', ctx, {
      role: PopulationRole.Council,
    });
    const flat = flatten(summary);
    expect(flat).toContain(
      `👥(${POPULATION_ROLES[PopulationRole.Council].icon}) +1`,
    );
  });

  it('handles population removal effect', () => {
    const summary = summarizeEffects(
      [
        {
          type: 'population',
          method: 'remove',
          params: { role: PopulationRole.Council },
        },
      ],
      ctx,
    );
    const desc = describeEffects(
      [
        {
          type: 'population',
          method: 'remove',
          params: { role: PopulationRole.Council },
        },
      ],
      ctx,
    );
    expect(summary).toContain(
      `👥(${POPULATION_ROLES[PopulationRole.Council].icon}) -1`,
    );
    expect(desc).toContain(
      `Remove ${POPULATION_ROLES[PopulationRole.Council].icon} ${POPULATION_ROLES[PopulationRole.Council].label}`,
    );
  });
});
