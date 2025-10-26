import { describe, it, expect } from 'vitest';
import { createTestEngine } from '../helpers.ts';

describe('EngineContext', () => {
	it('manages effect logs and cloning behaviour', () => {
		const engineContext = createTestEngine();
		expect(engineContext.resourceCatalogV2).toBeDefined();
		expect(engineContext.game.resourceCatalogV2).toBe(
			engineContext.resourceCatalogV2,
		);
		const key = 'effect';

		expect(engineContext.pullEffectLog(key)).toBeUndefined();

		const originalObject = { value: 1 };
		engineContext.pushEffectLog(key, originalObject);
		engineContext.pushEffectLog(key, 'second');

		expect(engineContext.pullEffectLog(key)).toEqual(originalObject);
		expect(engineContext.pullEffectLog(key)).toBe('second');
		expect(engineContext.pullEffectLog(key)).toBeUndefined();

		engineContext.pushEffectLog(key, originalObject);
		engineContext.pushEffectLog(key, 7);

		const drained = engineContext.drainEffectLogs();
		const drainedEntries = drained.get(key);
		expect(drainedEntries).toEqual([{ value: 1 }, 7]);
		expect(drainedEntries?.[0]).not.toBe(originalObject);
		expect(engineContext.pullEffectLog(key)).toBeUndefined();
		expect(engineContext.drainEffectLogs().size).toBe(0);
	});

	it('serializes queued tasks even after failures', async () => {
		const engineContext = createTestEngine();
		expect(engineContext.resourceCatalogV2).toBeDefined();
		expect(engineContext.game.resourceCatalogV2).toBe(
			engineContext.resourceCatalogV2,
		);
		const order: string[] = [];

		const first = engineContext.enqueue(async () => {
			await Promise.resolve();
			order.push('first');
			return 1;
		});
		const second = engineContext.enqueue(async () => {
			await Promise.resolve();
			order.push('second');
			return 2;
		});
		const third = engineContext.enqueue(async () => {
			await Promise.resolve();
			order.push('third');
			throw new Error('boom');
		});
		const fourth = engineContext.enqueue(async () => {
			await Promise.resolve();
			order.push('fourth');
			return 4;
		});

		await expect(first).resolves.toBe(1);
		await expect(second).resolves.toBe(2);
		await expect(third).rejects.toThrow('boom');
		await expect(fourth).resolves.toBe(4);
		expect(order).toEqual(['first', 'second', 'third', 'fourth']);
	});
});
