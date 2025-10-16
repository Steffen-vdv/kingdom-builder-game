import type {
	SessionOverviewContent,
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { describe, expect, expectTypeOf, it } from 'vitest';
import snapshot from '../../src/contexts/defaultRegistryMetadata.json';
import {
	createDefaultAssetMetadata,
	createDefaultOverviewContent,
	createDefaultRegistries,
	createDefaultRegistryMetadata,
	createDefaultTriggerMetadata,
	DEFAULT_ASSET_METADATA,
	DEFAULT_OVERVIEW_CONTENT,
	DEFAULT_REGISTRIES,
	DEFAULT_REGISTRY_METADATA,
	DEFAULT_TRIGGER_METADATA,
} from '../../src/contexts/defaultRegistryMetadata';

interface DefaultRegistrySnapshot {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: SessionSnapshotMetadata;
}

const SNAPSHOT = snapshot as DefaultRegistrySnapshot;

describe('defaultRegistryMetadata helpers', () => {
	it('creates frozen registry clones', () => {
		const first = createDefaultRegistries();
		const second = createDefaultRegistries();
		expect(first).not.toBe(second);
		expect(first).not.toBe(DEFAULT_REGISTRIES);
		expect(Object.isFrozen(first)).toBe(true);
		expect(Object.isFrozen(first.resources)).toBe(true);
		expect(Object.isFrozen(DEFAULT_REGISTRIES)).toBe(true);
	});

	it('clones and freezes default metadata', () => {
		const first = createDefaultRegistryMetadata();
		const second = createDefaultRegistryMetadata();
		expect(first).not.toBe(second);
		expect(first).not.toBe(DEFAULT_REGISTRY_METADATA);
		expect(first).toEqual(SNAPSHOT.metadata);
		expect(second).toEqual(SNAPSHOT.metadata);
		expect(Object.isFrozen(first)).toBe(true);
		expect(Object.isFrozen(second)).toBe(true);
		expect(DEFAULT_REGISTRY_METADATA).toEqual(SNAPSHOT.metadata);
		expect(Object.isFrozen(DEFAULT_REGISTRY_METADATA)).toBe(true);
	});

	it('exposes trigger metadata helpers', () => {
		const expected = SNAPSHOT.metadata.triggers ?? {};
		expect(DEFAULT_TRIGGER_METADATA).toEqual(expected);
		expect(Object.isFrozen(DEFAULT_TRIGGER_METADATA)).toBe(true);
		const clone = createDefaultTriggerMetadata();
		expect(clone).not.toBe(DEFAULT_TRIGGER_METADATA);
		expect(clone).toEqual(expected);
		if (clone) {
			expect(Object.isFrozen(clone)).toBe(true);
		}
		expectTypeOf(DEFAULT_TRIGGER_METADATA).toMatchTypeOf<
			SessionSnapshotMetadata['triggers']
		>();
	});

	it('provides asset descriptors', () => {
		const expected = SNAPSHOT.metadata.assets ?? {};
		expect(DEFAULT_ASSET_METADATA).toEqual(expected);
		expect(Object.isFrozen(DEFAULT_ASSET_METADATA)).toBe(true);
		const clone = createDefaultAssetMetadata();
		expect(clone).not.toBe(DEFAULT_ASSET_METADATA);
		expect(clone).toEqual(expected);
		if (clone) {
			expect(Object.isFrozen(clone)).toBe(true);
		}
		expectTypeOf(DEFAULT_ASSET_METADATA).toMatchTypeOf<
			SessionSnapshotMetadata['assets']
		>();
	});

	it('shares overview content helpers', () => {
		const expected = SNAPSHOT.metadata.overviewContent;
		expectTypeOf(DEFAULT_OVERVIEW_CONTENT).toMatchTypeOf<
			SessionOverviewContent | undefined
		>();
		expect(DEFAULT_OVERVIEW_CONTENT).toEqual(expected);
		if (expected) {
			expect(Object.isFrozen(DEFAULT_OVERVIEW_CONTENT)).toBe(true);
			const clone = createDefaultOverviewContent();
			if (clone) {
				expect(clone).not.toBe(DEFAULT_OVERVIEW_CONTENT);
				expect(clone).toEqual(expected);
				expect(Object.isFrozen(clone)).toBe(true);
			}
		}
	});
});
