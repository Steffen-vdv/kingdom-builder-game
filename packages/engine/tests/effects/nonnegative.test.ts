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

describe('non-negative resources and stats', () => {
  it('clamps stat removal to zero', () => {
    const actions = createActionRegistry();
    actions.add('lower_fort', {
      id: 'lower_fort',
      name: 'Lower Fort',
      baseCosts: { [CResource.ap]: 0 },
      effects: [
        {
          type: 'stat',
          method: 'remove',
          params: { key: CStat.fortificationStrength, amount: 3 },
        },
      ],
    });
    const ctx = createTestEngine({ actions });
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const actionDef = actions.get('lower_fort');
    const amt = actionDef.effects.find((e) => e.type === 'stat')?.params
      ?.amount as number;
    ctx.activePlayer.stats[CStat.fortificationStrength] = amt - 1;
    const cost = getActionCosts('lower_fort', ctx)[Resource.ap] ?? 0;
    ctx.activePlayer.ap = cost;
    performAction('lower_fort', ctx);
    expect(ctx.activePlayer.fortificationStrength).toBe(0);
  });

  it('clamps negative resource additions to zero', () => {
    const actions = createActionRegistry();
    actions.add('lose_gold', {
      id: 'lose_gold',
      name: 'Lose Gold',
      baseCosts: { [CResource.ap]: 0 },
      effects: [
        {
          type: 'resource',
          method: 'add',
          params: { key: CResource.gold, amount: -5 },
        },
      ],
    });
    const ctx = createTestEngine({ actions });
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const actionDef = actions.get('lose_gold');
    const amt = actionDef.effects.find((e) => e.type === 'resource')?.params
      ?.amount as number;
    ctx.activePlayer.gold = 1;
    const cost = getActionCosts('lose_gold', ctx)[Resource.ap] ?? 0;
    ctx.activePlayer.ap = cost;
    performAction('lose_gold', ctx);
    expect(ctx.activePlayer.gold).toBe(Math.max(1 + amt, 0));
  });

  it('clamps negative stat additions to zero', () => {
    const actions = createActionRegistry();
    actions.add('bad_add', {
      id: 'bad_add',
      name: 'Bad Add',
      baseCosts: { [CResource.ap]: 0 },
      effects: [
        {
          type: 'stat',
          method: 'add',
          params: { key: CStat.armyStrength, amount: -4 },
        },
      ],
    });
    const ctx = createTestEngine({ actions });
    advance(ctx);
    ctx.game.currentPlayerIndex = 0;
    const actionDef = actions.get('bad_add');
    const amt = actionDef.effects.find((e) => e.type === 'stat')?.params
      ?.amount as number;
    const before = ctx.activePlayer.armyStrength;
    const cost = getActionCosts('bad_add', ctx)[Resource.ap] ?? 0;
    ctx.activePlayer.ap = cost;
    performAction('bad_add', ctx);
    expect(ctx.activePlayer.armyStrength).toBe(Math.max(before + amt, 0));
  });
});
