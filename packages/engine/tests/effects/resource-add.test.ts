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
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';

describe('resource:add effect', () => {
  it('increments a resource via action effect', () => {
    const actions = createActionRegistry();
    actions.add('grant_gold', {
      id: 'grant_gold',
      name: 'Grant Gold',
      baseCosts: { [CResource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'add',
          params: { key: CResource.gold, amount: 3 },
        },
      ],
    });
    const ctx = createTestEngine({ actions });
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const before = ctx.activePlayer.gold;
    const actionDefinition = actions.get('grant_gold');
    const amount = actionDefinition.effects.find(
      (effect) =>
        effect.type === 'resource' &&
        effect.method === 'add' &&
        effect.params?.key === CResource.gold,
    )?.params?.amount as number;
    const cost = getActionCosts('grant_gold', ctx)[Resource.ap] ?? 0;
    ctx.activePlayer.ap = cost;
    performAction('grant_gold', ctx);
    expect(ctx.activePlayer.gold).toBe(before + amount);
  });

  it('rounds fractional amounts according to round setting', () => {
    const actions = createActionRegistry();
    actions.add('round_up', {
      id: 'round_up',
      name: 'Round Up',
      baseCosts: { [CResource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'add',
          params: { key: CResource.gold, amount: 1.2 },
          round: 'up',
        },
      ],
    });
    actions.add('round_down', {
      id: 'round_down',
      name: 'Round Down',
      baseCosts: { [CResource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'add',
          params: { key: CResource.gold, amount: 1.8 },
          round: 'down',
        },
      ],
    });
    const ctx = createTestEngine({ actions });
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;

    let before = ctx.activePlayer.gold;
    let foundEffect = actions
      .get('round_up')
      .effects.find(
        (effect) =>
          effect.type === 'resource' &&
          effect.method === 'add' &&
          effect.params?.key === CResource.gold,
      );
    let total = (foundEffect?.params?.amount as number) || 0;
    if (foundEffect?.round === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (foundEffect?.round === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    let cost = getActionCosts('round_up', ctx)[Resource.ap] ?? 0;
    ctx.activePlayer.ap = cost;
    performAction('round_up', ctx);
    expect(ctx.activePlayer.gold).toBe(before + total);

    before = ctx.activePlayer.gold;
    foundEffect = actions
      .get('round_down')
      .effects.find(
        (effect) =>
          effect.type === 'resource' &&
          effect.method === 'add' &&
          effect.params?.key === CResource.gold,
      );
    total = (foundEffect?.params?.amount as number) || 0;
    if (foundEffect?.round === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (foundEffect?.round === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    cost = getActionCosts('round_down', ctx)[Resource.ap] ?? 0;
    ctx.activePlayer.ap = cost;
    performAction('round_down', ctx);
    expect(ctx.activePlayer.gold).toBe(before + total);
  });
});
