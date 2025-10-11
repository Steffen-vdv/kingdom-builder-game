import { describe, expect, it } from 'vitest';
import { resolvePrimaryIcon } from './resolvePrimaryIcon';

describe('resolvePrimaryIcon', () => {
	it('returns the configured resource icon when available', () => {
		const resources = {
			gold: { icon: '🪙' },
			happiness: { icon: '😊' },
		};
		const resolved = resolvePrimaryIcon({
			resources,
			primaryResourceKey: 'gold',
		});
		expect(resolved).toBe('🪙');
	});

	it('falls back to the first available resource icon when missing', () => {
		const resources = {
			happiness: { icon: '😊' },
			gold: { icon: '🪙' },
		};
		const resolved = resolvePrimaryIcon({
			resources,
			primaryResourceKey: 'non-existent',
		});
		expect(resolved).toBe('😊');
	});

	it('prefers explicitly configured icon when provided', () => {
		const resolved = resolvePrimaryIcon({
			explicitIcon: '👑',
		});
		expect(resolved).toBe('👑');
	});
});
