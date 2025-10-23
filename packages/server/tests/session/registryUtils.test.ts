import { describe, it, expect } from 'vitest';
import { freezeSerializedRegistry } from '../../src/session/registryUtils.js';

describe('freezeSerializedRegistry', () => {
	it('freezes registries and their definitions', () => {
		const registry = {
			alpha: { label: 'Alpha', nested: { value: 1 } },
			beta: null,
		} satisfies Record<
			string,
			{ label: string; nested?: { value: number } } | null
		>;
		const frozen = freezeSerializedRegistry(structuredClone(registry));
		expect(Object.isFrozen(frozen)).toBe(true);
		expect(Object.isFrozen(frozen.alpha)).toBe(true);
		expect(frozen.beta).toBeNull();
		expect(() => {
			(frozen as Record<string, unknown>).gamma = {};
		}).toThrow(TypeError);
		expect(() => {
			if (frozen.alpha) {
				frozen.alpha.label = 'Mutated';
			}
		}).toThrow(TypeError);
	});
});
