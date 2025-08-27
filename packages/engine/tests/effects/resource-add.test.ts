import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  createActionRegistry,
  Resource,
} from '../../src/index.ts';

describe('resource:add effect', () => {
  it('increments a resource via action effect', () => {
    const actions = createActionRegistry();
    actions.add('grant_gold', {
      id: 'grant_gold',
      name: 'Grant Gold',
      baseCosts: { [Resource.ap]: 0 },
      effects: [
        { type: 'resource', method: 'add', params: { key: Resource.gold, amount: 3 } },
      ],
    });
    const ctx = createEngine({ actions });
    runDevelopment(ctx);
    const before = ctx.activePlayer.gold;
    const def = actions.get('grant_gold');
    const amt = def.effects.find(
      (e) =>
        e.type === 'resource' &&
        e.method === 'add' &&
        e.params?.key === Resource.gold,
    )?.params?.amount as number;
    performAction('grant_gold', ctx);
    expect(ctx.activePlayer.gold).toBe(before + amt);
  });

  it('rounds fractional amounts according to round setting', () => {
    const actions = createActionRegistry();
    actions.add('round_up', {
      id: 'round_up',
      name: 'Round Up',
      baseCosts: { [Resource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'add',
          params: { key: Resource.gold, amount: 1.2 },
          round: 'up',
        },
      ],
    });
    actions.add('round_down', {
      id: 'round_down',
      name: 'Round Down',
      baseCosts: { [Resource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'add',
          params: { key: Resource.gold, amount: 1.8 },
          round: 'down',
        },
      ],
    });
    const ctx = createEngine({ actions });
    runDevelopment(ctx);

    let before = ctx.activePlayer.gold;
    let effect = actions.get('round_up').effects.find(
      (e) =>
        e.type === 'resource' &&
        e.method === 'add' &&
        e.params?.key === Resource.gold,
    );
    let total = (effect?.params?.amount as number) || 0;
    if (effect?.round === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (effect?.round === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    performAction('round_up', ctx);
    expect(ctx.activePlayer.gold).toBe(before + total);

    before = ctx.activePlayer.gold;
    effect = actions.get('round_down').effects.find(
      (e) =>
        e.type === 'resource' &&
        e.method === 'add' &&
        e.params?.key === Resource.gold,
    );
    total = (effect?.params?.amount as number) || 0;
    if (effect?.round === 'up')
      total = total >= 0 ? Math.ceil(total) : Math.floor(total);
    else if (effect?.round === 'down')
      total = total >= 0 ? Math.floor(total) : Math.ceil(total);
    performAction('round_down', ctx);
    expect(ctx.activePlayer.gold).toBe(before + total);
  });
});

