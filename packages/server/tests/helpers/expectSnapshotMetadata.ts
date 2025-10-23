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
	expect(metadata.assets).toBeDefined();
	expect(metadata.assets?.upkeep?.icon).toBeDefined();
	expect(metadata.assets?.transfer?.icon).toBeDefined();
}

export function expectStaticMetadata(
	metadata: SessionStaticMetadataPayload,
): void {
	const valueDescriptors = metadata.values?.descriptors ?? {};
	expect(Object.keys(valueDescriptors).length).toBeGreaterThan(0);
	const hasPercentDescriptor = Object.values(valueDescriptors).some(
		(descriptor) => descriptor?.displayAsPercent === true,
	);
	expect(hasPercentDescriptor).toBe(true);
	const triggerKeys = Object.keys(metadata.triggers ?? {});
	expect(triggerKeys.length).toBeGreaterThan(0);
	expect(metadata.overview).toBeDefined();
	if (metadata.overview) {
		const heroTokens = metadata.overview.hero?.tokens ?? {};
		expect(Object.keys(heroTokens).length).toBeGreaterThan(0);
	}
	expect(metadata.assets).toBeDefined();
	expect(metadata.assets?.upkeep?.icon).toBeDefined();
	expect(metadata.assets?.transfer?.icon).toBeDefined();
}
