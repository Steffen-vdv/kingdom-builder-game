import { describe, expect, it } from 'vitest';
import type { SessionResourceRegistryPayload } from '@kingdom-builder/protocol/session';
import { resolvePrimaryIcon } from './resolvePrimaryIcon';

describe('resolvePrimaryIcon', () => {
	const buildRegistry = (
		definitions: SessionResourceRegistryPayload['definitions'],
	): SessionResourceRegistryPayload => ({
		definitions,
		groups: {},
		globalActionCost: null,
	});

	it('returns the configured resource icon when available', () => {
		const resourceValues = buildRegistry({
			gold: {
				id: 'gold',
				display: {
					icon: '🪙',
					label: 'Gold',
					description: 'Primary currency.',
					order: 0,
				},
			},
			ap: {
				id: 'ap',
				display: {
					icon: '⚡',
					label: 'Action Points',
					description: 'Action energy.',
					order: 1,
				},
			},
		});
		const resolved = resolvePrimaryIcon(resourceValues, 'gold');
		expect(resolved).toEqual({
			icon: '🪙',
			resourceKey: 'gold',
			source: 'primary',
		});
	});

	it('falls back to the first available resource icon when missing', () => {
		const resourceValues = buildRegistry({
			ap: {
				id: 'ap',
				display: {
					icon: '⚡',
					label: 'Action Points',
					description: 'Action energy.',
					order: 0,
				},
			},
			gold: {
				id: 'gold',
				display: {
					icon: '🪙',
					label: 'Gold',
					description: 'Primary currency.',
					order: 1,
				},
			},
		});
		const resolved = resolvePrimaryIcon(resourceValues, 'non-existent');
		expect(resolved).toEqual({
			icon: '⚡',
			resourceKey: 'ap',
			source: 'fallback',
		});
	});

	it('returns a none source when no icons are available', () => {
		const resourceValues = buildRegistry({
			ap: {
				id: 'ap',
				display: {
					icon: '   ',
					label: 'Action Points',
					description: 'Action energy.',
					order: 0,
				},
			},
		});
		const resolved = resolvePrimaryIcon(resourceValues, 'ap');
		expect(resolved).toEqual({ source: 'none' });
	});
});
