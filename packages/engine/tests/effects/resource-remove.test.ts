import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  createActionRegistry,
  Resource,
  advance,
} from '../../src/index.ts';

describe('resource:remove effect', () => {
  it('decrements a resource via action effect', () => {
    const actions = createActionRegistry();
    actions.add('pay_gold', {
      id: 'pay_gold',
      name: 'Pay Gold',
      baseCosts: { [Resource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'remove',
          params: { key: Resource.gold, amount: 3 },
        },
      ],
    });
    const ctx = createEngine({ actions });
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const before = ctx.activePlayer.gold;
    const actionDefinition = actions.get('pay_gold');
    const amount = actionDefinition.effects.find(
      (effect) =>
        effect.type === 'resource' &&
        effect.method === 'remove' &&
        effect.params?.key === Resource.gold,
    )?.params?.amount as number;
    performAction('pay_gold', ctx);
    expect(ctx.activePlayer.gold).toBe(before - amount);
  });

  it('rounds fractional amounts according to round setting', () => {
    const actions = createActionRegistry();
    actions.add('round_up_remove', {
      id: 'round_up_remove',
      name: 'Round Up Remove',
      baseCosts: { [Resource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'remove',
          params: { key: Resource.gold, amount: 1.2 },
          round: 'up',
        },
      ],
    });
    actions.add('round_down_remove', {
      id: 'round_down_remove',
      name: 'Round Down Remove',
      baseCosts: { [Resource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'remove',
          params: { key: Resource.gold, amount: 1.8 },
          round: 'down',
        },
      ],
    });
    const ctx = createEngine({ actions });
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;

    let before = ctx.activePlayer.gold;
    let foundEffect = actions
      .get('round_up_remove')
      .effects.find(
        (effect) =>
          effect.type === 'resource' &&
          effect.method === 'remove' &&
          effect.params?.key === Resource.gold,
      );
    let total = (foundEffect?.params?.amount as number) || 0;
    if (foundEffect?.round === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (foundEffect?.round === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    performAction('round_up_remove', ctx);
    expect(ctx.activePlayer.gold).toBe(before - total);

    before = ctx.activePlayer.gold;
    foundEffect = actions
      .get('round_down_remove')
      .effects.find(
        (effect) =>
          effect.type === 'resource' &&
          effect.method === 'remove' &&
          effect.params?.key === Resource.gold,
      );
    total = (foundEffect?.params?.amount as number) || 0;
    if (foundEffect?.round === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (foundEffect?.round === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    performAction('round_down_remove', ctx);
    expect(ctx.activePlayer.gold).toBe(before - total);
  });
});
