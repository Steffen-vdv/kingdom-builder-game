import { describe, it, expect } from 'vitest';
import { createTestEngine } from '../helpers.ts';

describe('EngineContext effect logs', () => {
	it('returns undefined when there are no entries', () => {
		const engineContext = createTestEngine();
		expect(engineContext.pullEffectLog('missing')).toBeUndefined();
	});

	it('pulls entries in insertion order and clears the queue', () => {
		const engineContext = createTestEngine();
		engineContext.pushEffectLog('resource', { amount: 1 });
		engineContext.pushEffectLog('resource', { amount: 2 });
		engineContext.pushEffectLog('text', 'note');
		expect(engineContext.pullEffectLog('resource')).toEqual({ amount: 1 });
		expect(engineContext.pullEffectLog('resource')).toEqual({ amount: 2 });
		expect(engineContext.pullEffectLog('resource')).toBeUndefined();
		expect(engineContext.pullEffectLog('text')).toBe('note');
		expect(engineContext.pullEffectLog('text')).toBeUndefined();
	});

	it('clones drained entries and empties the log store', () => {
		const engineContext = createTestEngine();
		const original = { nested: { value: 1 } };
		engineContext.pushEffectLog('clone', original);
		engineContext.pushEffectLog('literal', 3);
		const drained = engineContext.drainEffectLogs();
		const cloned = drained.get('clone');
		expect(cloned).toBeDefined();
		if (!cloned) {
			throw new Error('Expected cloned entries to exist.');
		}
		const [firstEntry] = cloned as Array<{ nested: { value: number } }>;
		expect(firstEntry).not.toBe(original);
		expect(firstEntry.nested).not.toBe(original.nested);
		expect(firstEntry).toEqual({ nested: { value: 1 } });
		(firstEntry.nested as { value: number }).value = 99;
		expect(original.nested.value).toBe(1);
		const literalEntries = drained.get('literal');
		expect(literalEntries).toEqual([3]);
		expect(engineContext.pullEffectLog('clone')).toBeUndefined();
		expect(engineContext.pullEffectLog('literal')).toBeUndefined();
	});
});
