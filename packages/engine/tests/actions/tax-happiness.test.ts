import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src/index.ts';
import { Resource } from '@kingdom-builder/contents';
import { createContentFactory } from '../factories/content.ts';
import { createTestEngine } from '../helpers.ts';

describe('resource removal penalties', () => {
  it('reduces happiness when configured as a removal effect', () => {
    const content = createContentFactory();
    const action = content.action({
      effects: [
        {
          type: 'resource',
          method: 'remove',
          params: { key: Resource.happiness, amount: 1 },
          meta: { allowShortfall: true },
        },
      ],
    });
    const ctx = createTestEngine(content);
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    ctx.activePlayer.resources[Resource.happiness] = 2;
    const before = ctx.activePlayer.resources[Resource.happiness] ?? 0;
    const cost = getActionCosts(action.id, ctx)[Resource.ap] ?? 0;
    ctx.activePlayer.ap = cost;
    performAction(action.id, ctx);
    const after = ctx.activePlayer.resources[Resource.happiness] ?? 0;
    expect(after).toBe(before - 1);
  });
});
