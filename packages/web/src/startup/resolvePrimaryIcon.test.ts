import { describe, expect, it } from 'vitest';
import { resolvePrimaryIcon } from './resolvePrimaryIcon';

describe('resolvePrimaryIcon', () => {
	it('returns the configured resource icon when available', () => {
		const resources = {
			gold: { icon: '🪙' },
			ap: { icon: '⚡' },
		};
		const resolved = resolvePrimaryIcon(resources, 'gold');
		expect(resolved).toEqual({
			icon: '🪙',
			resourceKey: 'gold',
			source: 'primary',
		});
	});

	it('falls back to the first available resource icon when missing', () => {
		const resources = {
			ap: { icon: '⚡' },
			gold: { icon: '🪙' },
		};
		const resolved = resolvePrimaryIcon(resources, 'non-existent');
		expect(resolved).toEqual({
			icon: '⚡',
			resourceKey: 'ap',
			source: 'fallback',
		});
	});

	it('returns a none source when no icons are available', () => {
		const resources = {
			ap: {},
		};
		const resolved = resolvePrimaryIcon(resources, 'ap');
		expect(resolved).toEqual({ source: 'none' });
	});
});
