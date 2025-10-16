import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';

function wait(milliseconds: number) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe('EngineContext enqueue', () => {
	it('runs tasks sequentially', async () => {
		const engineContext = createTestEngine();
		const order: number[] = [];
		void engineContext.enqueue(async () => {
			await wait(10);
			order.push(1);
		});
		void engineContext.enqueue(() => {
			order.push(2);
		});
		void engineContext.enqueue(() => {
			order.push(3);
		});
		await engineContext.enqueue(() => advance(engineContext));
		expect(order).toEqual([1, 2, 3]);
	});
});
