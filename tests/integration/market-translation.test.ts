import { describe, it, expect } from 'vitest';
import { createEngine } from '@kingdom-builder/engine';
import { summarizeContent } from '@kingdom-builder/web/translation/content';
import {
  PHASES,
  POPULATIONS,
  GAME_START,
  RULES,
} from '@kingdom-builder/contents';
import { createContentFactory } from '../../packages/engine/tests/factories/content';

describe('Building translation with population bonus', () => {
  it('mentions population and related action', () => {
    const content = createContentFactory();
    const action = content.action({ name: 'work', icon: '🛠️', effects: [] });
    const building = content.building({
      onBuild: [
        {
          type: 'result_mod',
          method: 'add',
          params: {
            amount: 1,
            evaluation: { type: 'population', id: action.id },
          },
        },
      ],
    });
    const ctx = createEngine({
      actions: content.actions,
      buildings: content.buildings,
      developments: content.developments,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const summary = summarizeContent('building', building.id, ctx) as unknown;
    function flatten(items: unknown[]): string[] {
      return items.flatMap((i) =>
        typeof i === 'string'
          ? [i]
          : Array.isArray((i as { items?: unknown[] }).items)
            ? flatten((i as { items: unknown[] }).items)
            : [],
      );
    }
    const lines = flatten(summary as unknown[]);
    expect(
      lines.some(
        (l) => l.includes('Population through') && l.includes(action.name),
      ),
    ).toBe(true);
    expect(ctx.actions.get(action.id)).toBeDefined();
    expect(ctx.buildings.get(building.id)).toBeDefined();
  });
});
