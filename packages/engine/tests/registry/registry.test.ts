import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Registry } from '../../src/registry.ts';

describe('Registry', () => {
	it('adds and retrieves values using schema', () => {
		const schema = z.object({ value: z.number() });
		const registry = new Registry<{ value: number }>(schema);
		const entry = { value: 1 };
		registry.add('one', entry);
		expect(registry.get('one')).toEqual(entry);
	});

	it('throws when id is unknown', () => {
		const registry = new Registry<{ id: string }>();
		registry.add('known', { id: 'known' });
		expect(() => registry.get('unknown')).toThrow('Unknown id: unknown');
	});
});
