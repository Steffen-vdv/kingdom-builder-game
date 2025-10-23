import { describe, expect, it } from 'vitest';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol';
import { mergeSessionMetadata } from '../../src/session/mergeSessionMetadata.js';
import type { SessionStaticMetadataPayload } from '../../src/session/buildSessionMetadata.js';

function createBaseMetadata(): SessionStaticMetadataPayload {
	return {
		assets: {
			upkeep: { icon: 'base-upkeep-icon', label: 'Upkeep' },
			transfer: { icon: 'base-transfer-icon', label: 'Transfer' },
		},
		overview: {
			hero: {
				tokens: {
					upkeep: { icon: 'base-hero-upkeep' },
				},
			},
			tokens: {
				upkeep: {
					upkeep: { icon: 'base-token-upkeep' },
				},
			},
		},
	};
}

describe('mergeSessionMetadata', () => {
	it('retains asset descriptors from base metadata', () => {
		const baseMetadata = createBaseMetadata();
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.assets?.upkeep?.icon).toBe('base-upkeep-icon');
		expect(merged.assets?.transfer?.icon).toBe('base-transfer-icon');
	});

	it('merges overview tokens without mutating inputs', () => {
		const baseMetadata = createBaseMetadata();
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview: {
				hero: {
					tokens: {
						upkeep: { icon: 'snapshot-hero-upkeep' },
						transfer: { icon: 'snapshot-hero-transfer' },
					},
				},
				tokens: {
					upkeep: {
						upkeep: { icon: 'snapshot-token-upkeep' },
					},
					transfer: {
						transfer: { icon: 'snapshot-token-transfer' },
					},
				},
			},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.overview?.hero?.tokens?.upkeep?.icon).toBe(
			'snapshot-hero-upkeep',
		);
		expect(merged.overview?.hero?.tokens?.transfer?.icon).toBe(
			'snapshot-hero-transfer',
		);
		expect(merged.overview?.tokens?.upkeep?.upkeep?.icon).toBe(
			'snapshot-token-upkeep',
		);
		expect(merged.overview?.tokens?.transfer?.transfer?.icon).toBe(
			'snapshot-token-transfer',
		);
		expect(baseMetadata.overview?.hero?.tokens?.transfer).toBeUndefined();
		expect(snapshot.overview?.hero?.tokens?.upkeep?.icon).toBe(
			'snapshot-hero-upkeep',
		);
	});

	it('applies snapshot overrides while preserving base descriptors', () => {
		const baseMetadata = createBaseMetadata();
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			assets: {
				upkeep: { icon: 'snapshot-upkeep', label: 'Clean' },
			},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.assets?.upkeep?.icon).toBe('snapshot-upkeep');
		expect(merged.assets?.upkeep?.label).toBe('Clean');
		expect(merged.assets?.transfer?.icon).toBe('base-transfer-icon');
		expect(baseMetadata.assets?.upkeep?.icon).toBe('base-upkeep-icon');
	});
});
