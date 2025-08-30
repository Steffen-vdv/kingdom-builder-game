import { describe, it, expect } from 'vitest';
import { performAction, Resource, Stat, advance } from '../../src/index.ts';
import { createActionRegistry } from '@kingdom-builder/contents';
import { createTestEngine } from '../test-utils';

describe('stat:add effect', () => {
  it('increments a stat via action effect', () => {
    const actions = createActionRegistry();
    actions.add('train_army', {
      id: 'train_army',
      name: 'Train Army',
      baseCosts: { [Resource.ap]: 0 },
      effects: [
        {
          type: 'stat',
          method: 'add',
          params: { key: Stat.armyStrength, amount: 3 },
        },
      ],
    });
    const ctx = createTestEngine({ actions });
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const before = ctx.activePlayer.armyStrength;
    const actionDefinition = actions.get('train_army');
    const amount = actionDefinition.effects.find(
      (effect) =>
        effect.type === 'stat' &&
        effect.method === 'add' &&
        effect.params?.key === Stat.armyStrength,
    )?.params?.amount as number;
    performAction('train_army', ctx);
    expect(ctx.activePlayer.armyStrength).toBe(before + amount);
  });
});
