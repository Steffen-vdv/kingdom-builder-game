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
	const valueMetadata = metadata.values;
	expect(valueMetadata).toBeDefined();
	expect((metadata as Record<string, unknown>).resources).toBeUndefined();
	expect((metadata as Record<string, unknown>).stats).toBeUndefined();
	expect((metadata as Record<string, unknown>).populations).toBeUndefined();
	if (valueMetadata?.descriptors) {
		expect(Object.keys(valueMetadata.descriptors).length).toBeGreaterThan(0);
	}
	expect(metadata.assets).toBeDefined();
	expect(metadata.assets?.upkeep?.icon).toBeDefined();
	expect(metadata.assets?.transfer?.icon).toBeDefined();
}

export function expectStaticMetadata(
	metadata: SessionStaticMetadataPayload,
): void {
	const valueDescriptors = Object.keys(metadata.values?.descriptors ?? {});
	expect(valueDescriptors.length).toBeGreaterThan(0);
	const orderedValues = metadata.values?.ordered ?? [];
	expect(orderedValues.length).toBeGreaterThan(0);
	expect((metadata as Record<string, unknown>).resources).toBeUndefined();
	expect((metadata as Record<string, unknown>).stats).toBeUndefined();
	expect((metadata as Record<string, unknown>).populations).toBeUndefined();
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
