import { describe, expect, it } from 'vitest';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { mergeSessionMetadata } from '../../src/state/useSessionTranslationContext';

describe('mergeSessionMetadata', () => {
	it('preserves fallback descriptors when overrides omit them', () => {
		const fallback: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			stats: {
				absorption: { icon: '🌀', label: 'Absorption' },
			},
		};
		const current: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: { legion: ['mod-1'] },
		};
		const overrides: Partial<SessionSnapshotMetadata> = {
			passiveEvaluationModifiers: current.passiveEvaluationModifiers,
			effectLogs: { action: [{}] },
		};
		const merged = mergeSessionMetadata(fallback, current, overrides);
		expect(merged.stats?.absorption?.icon).toBe('🌀');
		expect(merged.passiveEvaluationModifiers).toBe(
			current.passiveEvaluationModifiers,
		);
		expect(merged.effectLogs).toEqual({ action: [{}] });
	});

	it('allows overrides to replace fallback descriptors', () => {
		const fallback: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			stats: {
				absorption: { icon: '🌀', label: 'Absorption' },
			},
		};
		const current: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			stats: {
				absorption: { icon: '🌪️', label: 'Absorption' },
			},
		};
		const merged = mergeSessionMetadata(fallback, current);
		expect(merged.stats?.absorption?.icon).toBe('🌪️');
	});
});
