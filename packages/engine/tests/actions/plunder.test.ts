import { describe, it, expect } from 'vitest';
import { performAction, runEffects, Resource } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('Plunder action', () => {
  it('transfers base percentage of defender gold', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    ctx.activePlayer.resources[Resource.gold] = 0;
    ctx.opponent.resources[Resource.gold] = 100;
    performAction('plunder', ctx);
    expect(ctx.activePlayer.resources[Resource.gold]).toBe(25);
    expect(ctx.opponent.resources[Resource.gold]).toBe(75);
  });

  it('transfers nothing if defender lacks gold', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    ctx.activePlayer.resources[Resource.gold] = 0;
    ctx.opponent.resources[Resource.gold] = 0;
    performAction('plunder', ctx);
    expect(ctx.activePlayer.resources[Resource.gold]).toBe(0);
    expect(ctx.opponent.resources[Resource.gold]).toBe(0);
  });

  it('defaults to 25% when percent is omitted', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.resources[Resource.gold] = 0;
    ctx.opponent.resources[Resource.gold] = 100;
    runEffects(
      [
        {
          type: 'resource',
          method: 'transfer',
          params: { key: Resource.gold },
        },
      ],
      ctx,
    );
    expect(ctx.activePlayer.resources[Resource.gold]).toBe(25);
    expect(ctx.opponent.resources[Resource.gold]).toBe(75);
  });

  it('honors percentage modifiers', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    ctx.activePlayer.resources[Resource.gold] = 0;
    ctx.opponent.resources[Resource.gold] = 100;
    runEffects(
      [
        {
          type: 'passive',
          method: 'add',
          params: { id: 'plunder_bonus' },
          effects: [
            {
              type: 'result_mod',
              method: 'add',
              params: {
                id: 'plunder_bonus_pct',
                evaluation: { type: 'transfer_pct', id: 'percent' },
                adjust: 10,
              },
            },
          ],
        },
      ],
      ctx,
    );
    performAction('plunder', ctx);
    expect(ctx.activePlayer.resources[Resource.gold]).toBe(35);
    expect(ctx.opponent.resources[Resource.gold]).toBe(65);
  });

  it('does not transfer negative gold when modifiers drop percentage below zero', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    ctx.activePlayer.resources[Resource.gold] = 0;
    ctx.opponent.resources[Resource.gold] = 100;
    runEffects(
      [
        {
          type: 'passive',
          method: 'add',
          params: { id: 'plunder_penalty' },
          effects: [
            {
              type: 'result_mod',
              method: 'add',
              params: {
                id: 'plunder_penalty_pct',
                evaluation: { type: 'transfer_pct', id: 'percent' },
                adjust: -50,
              },
            },
          ],
        },
      ],
      ctx,
    );
    performAction('plunder', ctx);
    expect(ctx.activePlayer.resources[Resource.gold]).toBe(0);
    expect(ctx.opponent.resources[Resource.gold]).toBe(100);
  });
});
