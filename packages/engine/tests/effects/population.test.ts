import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';
import { Resource as CResource } from '@kingdom-builder/contents';

describe('population effects', () => {
  it('adds and removes population', () => {
    const content = createContentFactory();
    const role = content.population();
    const add = content.action({
      effects: [
        { type: 'population', method: 'add', params: { role: role.id } },
        { type: 'population', method: 'add', params: { role: role.id } },
      ],
    });
    const remove = content.action({
      effects: [
        { type: 'population', method: 'remove', params: { role: role.id } },
      ],
    });
    const ctx = createTestEngine(content);
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    let cost = getActionCosts(add.id, ctx);
    ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
    performAction(add.id, ctx);
    const added = add.effects.filter((e) => e.method === 'add').length;
    expect(ctx.activePlayer.population[role.id]).toBe(added);
    cost = getActionCosts(remove.id, ctx);
    ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
    performAction(remove.id, ctx);
    const removed = remove.effects.filter((e) => e.method === 'remove').length;
    expect(ctx.activePlayer.population[role.id]).toBe(added - removed);
  });
});
