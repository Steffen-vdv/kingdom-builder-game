import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from '../../src/session/SessionManager.js';
import { expect } from 'vitest';

/**
 * Asserts that a session snapshot metadata object is present and contains passive evaluation modifiers.
 *
 * @param metadata - The session snapshot metadata to validate; may be undefined
 */
export function expectSnapshotMetadata(
	metadata: SessionSnapshotMetadata | undefined,
): void {
	expect(metadata).toBeDefined();
	if (!metadata) {
		return;
	}
	expect(metadata.passiveEvaluationModifiers).toBeDefined();
}

/**
 * Asserts that a session's static metadata contains required sections and entries.
 *
 * @param metadata - Static session metadata to validate; must include at least one stat key, at least one trigger key, and a defined `overview`. If `overview.hero.tokens` exists, it must contain at least one token.
 */
export function expectStaticMetadata(
	metadata: SessionStaticMetadataPayload,
): void {
	const statKeys = Object.keys(metadata.stats ?? {});
	expect(statKeys.length).toBeGreaterThan(0);
	const triggerKeys = Object.keys(metadata.triggers ?? {});
	expect(triggerKeys.length).toBeGreaterThan(0);
	expect(metadata.overview).toBeDefined();
	if (metadata.overview) {
		const heroTokens = metadata.overview.hero?.tokens ?? {};
		expect(Object.keys(heroTokens).length).toBeGreaterThan(0);
	}
}