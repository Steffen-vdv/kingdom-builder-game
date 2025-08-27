import { describe, it, expect } from 'vitest';
import {
  createEngine,
  runDevelopment,
  performAction,
  Resource,
  Stat,
  createActionRegistry,
} from '../../src/index.ts';

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
    const ctx = createEngine({ actions });
    runDevelopment(ctx);
    const before = ctx.activePlayer.armyStrength;
    const def = actions.get('train_army');
    const amt = def.effects.find(
      (e) =>
        e.type === 'stat' &&
        e.method === 'add' &&
        e.params?.key === Stat.armyStrength,
    )?.params?.amount as number;
    performAction('train_army', ctx);
    expect(ctx.activePlayer.armyStrength).toBe(before + amt);
  });
});
