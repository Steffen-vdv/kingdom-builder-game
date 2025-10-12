import { describe, expect, it } from 'vitest';
import { resolvePrimaryIcon } from './resolvePrimaryIcon';

describe('resolvePrimaryIcon', () => {
	const metadata = {
		gold: { icon: '🪙' },
		ap: { icon: '⚡' },
	};

	it('returns the configured resource icon when available', () => {
		const resolved = resolvePrimaryIcon({
			metadata,
			primaryResourceId: 'gold',
		});
		expect(resolved).toBe('🪙');
	});

	it('falls back to the first available resource icon when missing', () => {
		const resolved = resolvePrimaryIcon({
			metadata,
			primaryResourceId: 'unknown',
		});
		expect(resolved).toBe('🪙');
	});
});
