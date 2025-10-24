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

	it('continues scheduling after a rejected task', async () => {
		const engineContext = createTestEngine();
		const events: string[] = [];
		const failingTask = engineContext.enqueue(() => {
			events.push('before-error');
			throw new Error('enqueue failure');
		});
		await expect(failingTask).rejects.toThrow('enqueue failure');
		await engineContext.enqueue(() => {
			events.push('after-error');
		});
		expect(events).toEqual(['before-error', 'after-error']);
	});
});
