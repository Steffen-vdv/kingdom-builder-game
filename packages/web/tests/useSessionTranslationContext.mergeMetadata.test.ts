import { describe, expect, it } from 'vitest';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { mergeSessionMetadataForTranslation } from '../src/state/useSessionTranslationContext';

describe('mergeSessionMetadataForTranslation', () => {
	const baseMetadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		stats: {
			armyStrength: { icon: '⚔️', label: 'Army Strength' },
		},
		assets: {
			population: { icon: '👥', label: 'Population' },
		},
	};

	it('falls back to cached metadata for missing descriptors', () => {
		const liveMetadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
		};
		const merged = mergeSessionMetadataForTranslation(
			liveMetadata,
			baseMetadata,
		);
		expect(merged.stats).toEqual(baseMetadata.stats);
		expect(merged.assets).toEqual(baseMetadata.assets);
	});

	it('prefers live metadata when descriptors are provided', () => {
		const liveMetadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			stats: {
				armyStrength: { icon: '🗡️', label: 'Army Strength' },
			},
		};
		const merged = mergeSessionMetadataForTranslation(
			liveMetadata,
			baseMetadata,
		);
		expect(merged.stats).toEqual(liveMetadata.stats);
	});

	it('fills missing descriptor fields from fallback metadata', () => {
		const liveMetadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			stats: {
				armyStrength: { label: 'Military Power' },
			},
		};
		const merged = mergeSessionMetadataForTranslation(
			liveMetadata,
			baseMetadata,
		);
		expect(merged.stats?.armyStrength).toEqual({
			label: 'Military Power',
			icon: '⚔️',
			description: baseMetadata.stats?.armyStrength?.description,
		});
	});

	it('retains live effect logs and falls back otherwise', () => {
		const logs = { attack: [{}] };
		const fallbackLogs = { defense: [{}] };
		const liveMetadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			effectLogs: logs,
		};
		const mergedLive = mergeSessionMetadataForTranslation(liveMetadata, {
			...baseMetadata,
			effectLogs: fallbackLogs,
		});
		expect(mergedLive.effectLogs).toBe(logs);
		const mergedFallback = mergeSessionMetadataForTranslation(
			{ passiveEvaluationModifiers: {} },
			{ ...baseMetadata, effectLogs: fallbackLogs },
		);
		expect(mergedFallback.effectLogs).toBe(fallbackLogs);
	});
});
