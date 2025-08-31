import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('EngineContext enqueue', () => {
  it('runs tasks sequentially', async () => {
    const ctx = createTestEngine();
    const order: number[] = [];
    void ctx.enqueue(async () => {
      await wait(10);
      order.push(1);
    });
    void ctx.enqueue(() => {
      order.push(2);
    });
    void ctx.enqueue(() => {
      order.push(3);
    });
    await ctx.enqueue(() => advance(ctx));
    expect(order).toEqual([1, 2, 3]);
  });
});
