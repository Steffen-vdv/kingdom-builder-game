import { expect } from 'vitest';
import type { SessionSnapshot } from '@kingdom-builder/protocol';
import type { SessionManager } from '../../src/session/SessionManager.js';

type StaticMetadata = ReturnType<SessionManager['getMetadata']>;
type MetadataKey = keyof StaticMetadata & keyof SessionSnapshot['metadata'];

const STATIC_METADATA_KEYS: MetadataKey[] = [
	'resources',
	'populations',
	'buildings',
	'developments',
	'stats',
	'phases',
	'triggers',
	'assets',
];

export function expectSnapshotIncludesStaticMetadata(
	snapshot: SessionSnapshot,
	manager: SessionManager,
): void {
	const metadata = snapshot.metadata;
	const staticMetadata = manager.getMetadata();
	expect(metadata.passiveEvaluationModifiers).toBeDefined();
	for (const key of STATIC_METADATA_KEYS) {
		const staticSection = staticMetadata[key];
		if (!staticSection) {
			continue;
		}
		expect(metadata[key]).toBeDefined();
		expect(metadata[key]).toEqual(staticSection);
	}
}

export function expectSnapshotMetadataIsolation(
	snapshot: SessionSnapshot,
	manager: SessionManager,
): void {
	const baseline = manager.getMetadata();
	if (snapshot.metadata.resources) {
		snapshot.metadata.resources['test:resource'] = { label: 'Test Resource' };
	}
	if (snapshot.metadata.triggers) {
		snapshot.metadata.triggers['test:trigger'] = { label: 'Test Trigger' };
	}
	expect(manager.getMetadata()).toEqual(baseline);
}
