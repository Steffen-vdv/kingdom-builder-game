import { describe, expect, it } from 'vitest';
import { resolvePrimaryIcon } from './resolvePrimaryIcon';
import type { IconSource } from './resolvePrimaryIcon';

describe('resolvePrimaryIcon', () => {
	const createResources = (): Record<string, IconSource> => ({
		primary: { icon: '🔥' },
		backup: { icon: '💎' },
		empty: {},
	});

	it('returns the configured resource icon when available', () => {
		const resources = createResources();
		const resolved = resolvePrimaryIcon({
			resources,
			preferredResourceKey: 'primary',
			fallbackKeys: Object.keys(resources),
		});
		expect(resolved).toBe('🔥');
	});

	it('falls back to the first available resource icon when missing', () => {
		const resources = createResources();
		const resolved = resolvePrimaryIcon({
			resources,
			preferredResourceKey: 'unknown',
			fallbackKeys: ['empty', 'backup', 'primary'],
		});
		expect(resolved).toBe('💎');
	});
});
