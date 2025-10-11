import { describe, expect, it } from 'vitest';
import type {
	SessionSnapshotMetadata,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import { resolvePrimaryIcon } from './resolvePrimaryIcon';

const resources: Record<string, SessionResourceDefinition> = {
	gold: { key: 'gold', icon: '💰', label: 'Gold' },
	happiness: { key: 'happiness', icon: '😊', label: 'Happiness' },
};

const metadata: SessionSnapshotMetadata = {
	passiveEvaluationModifiers: {},
	resources: {
		gold: { icon: '💰' },
		happiness: { icon: '😊' },
	},
	assets: {
		primary: { icon: '👑' },
	},
};

describe('resolvePrimaryIcon', () => {
	it('returns the primary asset icon when configured', () => {
		const resolved = resolvePrimaryIcon({ metadata, resources });
		expect(resolved).toBe('👑');
	});

	it('prefers the primary resource icon when asset metadata is missing', () => {
		const resolved = resolvePrimaryIcon({
			metadata: { ...metadata, assets: {} },
			resources,
			primaryResourceKey: 'gold',
		});
		expect(resolved).toBe('💰');
	});

	it('falls back to the first available resource icon', () => {
		const resolved = resolvePrimaryIcon({
			metadata: { passiveEvaluationModifiers: {} },
			resources,
			primaryResourceKey: 'non-existent',
		});
		expect(resolved).toBe('💰');
	});
});
