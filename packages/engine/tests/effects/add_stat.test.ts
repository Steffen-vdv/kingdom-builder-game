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
    performAction('train_army', ctx);
    expect(ctx.activePlayer.armyStrength).toBe(before + 3);
  });
});
