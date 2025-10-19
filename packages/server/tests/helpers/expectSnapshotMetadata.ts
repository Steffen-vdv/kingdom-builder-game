import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from '../../src/session/SessionManager.js';
import { expect } from 'vitest';

export function expectSnapshotMetadata(
	metadata: SessionSnapshotMetadata | undefined,
): void {
	expect(metadata).toBeDefined();
	if (!metadata) {
		return;
	}
	expect(metadata.passiveEvaluationModifiers).toBeDefined();
}

export function expectStaticMetadata(
	metadata: SessionStaticMetadataPayload,
): void {
	const statKeys = Object.keys(metadata.stats ?? {});
	expect(statKeys.length).toBeGreaterThan(0);
	const hasPercentStat = Object.values(metadata.stats ?? {}).some(
		(descriptor) => descriptor?.displayAsPercent === true,
	);
	expect(hasPercentStat).toBe(true);
	const triggerKeys = Object.keys(metadata.triggers ?? {});
	expect(triggerKeys.length).toBeGreaterThan(0);
	expect(metadata.overview).toBeDefined();
	if (metadata.overview) {
		const heroTokens = metadata.overview.hero?.tokens ?? {};
		expect(Object.keys(heroTokens).length).toBeGreaterThan(0);
	}
}
