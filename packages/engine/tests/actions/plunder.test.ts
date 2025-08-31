import { describe, it, expect } from 'vitest';
import { performAction, runEffects } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { Resource as CResource } from '@kingdom-builder/contents';

function getBasePercent(ctx: ReturnType<typeof createTestEngine>): number {
  const def = ctx.actions.get('plunder');
  const effect = def.effects.find(
    (e) => e.type === 'resource' && e.method === 'transfer',
  );
  return Number(effect?.params?.['percent'] ?? 0);
}

describe('Plunder action', () => {
  it('transfers base percentage of defender gold', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    const percent = getBasePercent(ctx);
    ctx.activePlayer.resources[CResource.gold] = 0;
    const oppGold = 100;
    ctx.opponent.resources[CResource.gold] = oppGold;
    performAction('plunder', ctx);
    const expected = Math.floor((oppGold * percent) / 100);
    expect(ctx.activePlayer.resources[CResource.gold]).toBe(expected);
    expect(ctx.opponent.resources[CResource.gold]).toBe(oppGold - expected);
  });

  it('transfers nothing if defender lacks gold', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    ctx.activePlayer.resources[CResource.gold] = 0;
    ctx.opponent.resources[CResource.gold] = 0;
    performAction('plunder', ctx);
    expect(ctx.activePlayer.resources[CResource.gold]).toBe(0);
    expect(ctx.opponent.resources[CResource.gold]).toBe(0);
  });

  it('defaults to 25% when percent is omitted', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.resources[CResource.gold] = 0;
    const oppGold = 100;
    ctx.opponent.resources[CResource.gold] = oppGold;
    runEffects(
      [
        {
          type: 'resource',
          method: 'transfer',
          params: { key: CResource.gold },
        },
      ],
      ctx,
    );
    const percent = getBasePercent(ctx);
    const expected = Math.floor((oppGold * percent) / 100);
    expect(ctx.activePlayer.resources[CResource.gold]).toBe(expected);
    expect(ctx.opponent.resources[CResource.gold]).toBe(oppGold - expected);
  });

  it('honors percentage modifiers', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    ctx.activePlayer.resources[CResource.gold] = 0;
    const oppGold = 100;
    ctx.opponent.resources[CResource.gold] = oppGold;
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
    const percent = getBasePercent(ctx) + 10;
    const expected = Math.floor((oppGold * percent) / 100);
    expect(ctx.activePlayer.resources[CResource.gold]).toBe(expected);
    expect(ctx.opponent.resources[CResource.gold]).toBe(oppGold - expected);
  });

  it('clamps transfer to available when modifiers exceed 100%', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    ctx.activePlayer.resources[CResource.gold] = 0;
    const oppGold = 100;
    ctx.opponent.resources[CResource.gold] = oppGold;
    runEffects(
      [
        {
          type: 'passive',
          method: 'add',
          params: { id: 'plunder_overkill' },
          effects: [
            {
              type: 'result_mod',
              method: 'add',
              params: {
                id: 'plunder_overkill_pct',
                evaluation: { type: 'transfer_pct', id: 'percent' },
                adjust: 100,
              },
            },
          ],
        },
      ],
      ctx,
    );
    performAction('plunder', ctx);
    const percent = getBasePercent(ctx) + 100;
    const transfer = Math.min(oppGold, Math.floor((oppGold * percent) / 100));
    expect(ctx.activePlayer.resources[CResource.gold]).toBe(transfer);
    expect(ctx.opponent.resources[CResource.gold]).toBe(oppGold - transfer);
  });

  it('does not transfer negative gold when modifiers drop percentage below zero', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.actions.add('plunder');
    ctx.activePlayer.resources[CResource.gold] = 0;
    const oppGold = 100;
    ctx.opponent.resources[CResource.gold] = oppGold;
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
    const percent = getBasePercent(ctx) - 50;
    const expected = Math.max(0, Math.floor((oppGold * percent) / 100));
    expect(ctx.activePlayer.resources[CResource.gold]).toBe(expected);
    expect(ctx.opponent.resources[CResource.gold]).toBe(oppGold - expected);
  });
});
