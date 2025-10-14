import { describe, expect, it } from 'vitest';
import {
	LAND_INFO,
	OVERVIEW_CONTENT,
	RESOURCES,
	TRIGGER_INFO,
} from '@kingdom-builder/contents';
import { SessionMetadataBuilder } from '../src/session/SessionMetadataBuilder.js';

describe('SessionMetadataBuilder', () => {
	it('produces metadata with resource, trigger, asset, and overview entries', () => {
		const builder = new SessionMetadataBuilder();
		const metadata = builder.createSnapshotMetadata();
		const [resourceKey, resourceInfo] = Object.entries(RESOURCES)[0] ?? [];
		expect(resourceKey).toBeTypeOf('string');
		if (resourceKey && resourceInfo) {
			expect(metadata.resources?.[resourceKey]?.label).toBe(resourceInfo.label);
		}
		const [triggerKey, triggerInfo] = Object.entries(TRIGGER_INFO)[0] ?? [];
		expect(triggerKey).toBeTypeOf('string');
		if (triggerKey && triggerInfo) {
			expect(metadata.triggers?.[triggerKey]?.icon).toBe(triggerInfo.icon);
		}
		expect(metadata.assets?.land?.icon).toBe(LAND_INFO.icon);
		expect(metadata.assets?.land?.label).toBe(LAND_INFO.label);
		const overviewTokens = metadata.overviewContent?.tokens?.resources;
		const templateTokens = OVERVIEW_CONTENT.tokens?.resources ?? {};
		const [tokenKey, tokenValues] = Object.entries(templateTokens)[0] ?? [];
		if (tokenKey && tokenValues) {
			expect(overviewTokens?.[tokenKey]).toEqual(tokenValues);
		}
	});

	it('returns deep clones of registries and metadata', () => {
		const builder = new SessionMetadataBuilder();
		const registriesA = builder.createRegistriesPayload();
		const registriesB = builder.createRegistriesPayload();
		expect(registriesA).not.toBe(registriesB);
		const resourceEntries = Object.entries(registriesA.resources ?? {});
		const [resourceKey] = resourceEntries[0] ?? [];
		if (resourceKey) {
			registriesA.resources[resourceKey]!.label = 'Mutated';
			expect(registriesB.resources[resourceKey]?.label).not.toBe('Mutated');
		}
		const metadataA = builder.createSnapshotMetadata();
		const metadataB = builder.createSnapshotMetadata();
		expect(metadataA).not.toBe(metadataB);
		const [metadataResourceKey] = Object.keys(metadataA.resources ?? {}) ?? [];
		if (metadataResourceKey) {
			metadataA.resources![metadataResourceKey]!.label = 'Changed';
			expect(metadataB.resources?.[metadataResourceKey]?.label).not.toBe(
				'Changed',
			);
		}
	});
});
