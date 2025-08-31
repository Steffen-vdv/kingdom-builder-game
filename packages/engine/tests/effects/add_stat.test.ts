import { describe, it, expect } from 'vitest';
import {
  performAction,
  Resource,
  advance,
  getActionCosts,
} from '../../src/index.ts';
import {
  createActionRegistry,
  Resource as CResource,
  Stat as CStat,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';

describe('stat:add effect', () => {
  it('increments a stat via action effect', () => {
    const actions = createActionRegistry();
    actions.add('train_army', {
      id: 'train_army',
      name: 'Train Army',
      baseCosts: { [CResource.ap]: 0 },
      effects: [
        {
          type: 'stat',
          method: 'add',
          params: { key: CStat.armyStrength, amount: 3 },
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
        effect.params?.key === CStat.armyStrength,
    )?.params?.amount as number;
    const costs = getActionCosts('train_army', ctx);
    ctx.activePlayer.ap = costs[Resource.ap] ?? 0;
    performAction('train_army', ctx);
    expect(ctx.activePlayer.armyStrength).toBe(before + amount);
  });
});
