import { describe, expect, it } from 'vitest';
import { resolvePrimaryIcon } from './resolvePrimaryIcon';

describe('resolvePrimaryIcon', () => {
	it('returns the configured resource icon when available', () => {
		const resources = {
			gold: { icon: '💰' },
			mana: { icon: '✨' },
		};
		const resolved = resolvePrimaryIcon(resources, 'gold');
		expect(resolved).toBe('💰');
	});

	it('falls back to the first available resource icon when missing', () => {
		const resources = {
			gold: { icon: '💰' },
			mana: { icon: '✨' },
		};
		const resolved = resolvePrimaryIcon(resources, 'non-existent');
		expect(resolved).toBe('💰');
	});
});
