import { describe, expect, it } from 'vitest';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol';
import { mergeSessionMetadata } from '../../src/session/mergeSessionMetadata.js';
import type { SessionStaticMetadataPayload } from '../../src/session/buildSessionMetadata.js';

function createBaseMetadata(): SessionStaticMetadataPayload {
	return {
		passiveEvaluationModifiers: {},
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

	it('deletes resources when both base and snapshot are undefined', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.resources).toBeUndefined();
	});

	it('deletes populations when merged result is undefined', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.populations).toBeUndefined();
	});

	it('deletes hero.tokens when merged result is undefined', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
			overview: {
				hero: {},
			},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview: {
				hero: {},
			},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.overview?.hero?.tokens).toBeUndefined();
	});

	it('deletes result.tokens when merged result is undefined', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
			overview: {},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview: {},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.overview?.tokens).toBeUndefined();
	});

	it('deletes token category when override is undefined', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
			overview: {
				tokens: {
					upkeep: {
						cost: { icon: 'base-cost' },
					},
				},
			},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview: {
				tokens: {
					upkeep: undefined,
				} as never,
			},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.overview?.tokens?.upkeep).toBeUndefined();
	});

	it('adds new token category from overrides', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
			overview: {
				tokens: {},
			},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview: {
				tokens: {
					transfer: {
						amount: { icon: 'new-transfer' },
					},
				},
			},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.overview?.tokens?.transfer?.amount?.icon).toBe(
			'new-transfer',
		);
	});

	it('includes effectLogs from snapshot when present', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			effectLogs: [{ effectId: 'test', message: 'test log' }],
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.effectLogs).toBeDefined();
		expect(merged.effectLogs?.[0]?.effectId).toBe('test');
	});

	it('returns base only when overrides are not provided', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
			resources: {
				gold: { label: 'Gold', icon: '💰' },
			},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.resources?.gold?.label).toBe('Gold');
	});

	it('clones base overview when no override is provided', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
			overview: {
				hero: {
					tokens: { key: { icon: 'base-icon' } },
				},
			},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.overview?.hero?.tokens?.key?.icon).toBe('base-icon');
	});

	it('creates overview from scratch when base is missing', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview: {
				hero: {
					tokens: { newKey: { icon: 'new-icon' } },
				},
			},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.overview?.hero?.tokens?.newKey?.icon).toBe('new-icon');
	});

	it('overrides sections when provided in snapshot', () => {
		const baseMetadata: SessionStaticMetadataPayload = {
			passiveEvaluationModifiers: {},
			overview: {
				sections: [{ title: 'Base Section' }],
			},
		};
		const snapshot: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview: {
				sections: [{ title: 'Snapshot Section' }],
			},
		};
		const merged = mergeSessionMetadata({
			baseMetadata,
			snapshotMetadata: snapshot,
		});
		expect(merged.overview?.sections?.[0]?.title).toBe('Snapshot Section');
	});
});
