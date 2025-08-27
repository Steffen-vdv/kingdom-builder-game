import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  createActionRegistry,
  Resource,
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
    runDevelopment(ctx);
    const before = ctx.activePlayer.gold;
    const def = actions.get('pay_gold');
    const amt = def.effects.find(
      (e) =>
        e.type === 'resource' &&
        e.method === 'remove' &&
        e.params?.key === Resource.gold,
    )?.params?.amount as number;
    performAction('pay_gold', ctx);
    expect(ctx.activePlayer.gold).toBe(before - amt);
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
    runDevelopment(ctx);

    let before = ctx.activePlayer.gold;
    let effect = actions.get('round_up_remove').effects.find(
      (e) =>
        e.type === 'resource' &&
        e.method === 'remove' &&
        e.params?.key === Resource.gold,
    );
    let total = (effect?.params?.amount as number) || 0;
    if (effect?.round === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (effect?.round === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    performAction('round_up_remove', ctx);
    expect(ctx.activePlayer.gold).toBe(before - total);

    before = ctx.activePlayer.gold;
    effect = actions.get('round_down_remove').effects.find(
      (e) =>
        e.type === 'resource' &&
        e.method === 'remove' &&
        e.params?.key === Resource.gold,
    );
    total = (effect?.params?.amount as number) || 0;
    if (effect?.round === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (effect?.round === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    performAction('round_down_remove', ctx);
    expect(ctx.activePlayer.gold).toBe(before - total);
  });
});

