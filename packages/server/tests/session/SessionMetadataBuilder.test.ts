import { describe, expect, it } from 'vitest';
import {
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	POPULATIONS,
	RESOURCES,
	STATS,
	TRIGGER_INFO,
} from '@kingdom-builder/contents';
import { createBaseSessionMetadata } from '../../src/session/SessionMetadataBuilder.js';

describe('createBaseSessionMetadata', () => {
	it('includes descriptors for each content registry entry', () => {
		const metadata = createBaseSessionMetadata();
		expect(metadata.resources).toBeDefined();
		for (const key of Object.keys(RESOURCES)) {
			expect(metadata.resources?.[key]).toBeDefined();
		}
		expect(metadata.populations).toBeDefined();
		for (const [id] of POPULATIONS.entries()) {
			expect(metadata.populations?.[id]).toBeDefined();
		}
		expect(metadata.buildings).toBeDefined();
		for (const [id] of BUILDINGS.entries()) {
			expect(metadata.buildings?.[id]).toBeDefined();
		}
		expect(metadata.developments).toBeDefined();
		for (const [id] of DEVELOPMENTS.entries()) {
			expect(metadata.developments?.[id]).toBeDefined();
		}
		expect(metadata.stats).toBeDefined();
		for (const key of Object.keys(STATS)) {
			expect(metadata.stats?.[key]).toBeDefined();
		}
		expect(metadata.phases).toBeDefined();
		for (const phase of PHASES) {
			expect(metadata.phases?.[phase.id]).toBeDefined();
		}
		expect(metadata.triggers).toBeDefined();
		for (const key of Object.keys(TRIGGER_INFO)) {
			expect(metadata.triggers?.[key]).toBeDefined();
		}
		expect(metadata.assets?.land).toBeDefined();
		expect(metadata.assets?.slot).toBeDefined();
		expect(metadata.assets?.passive).toBeDefined();
	});

	it('returns detached metadata clones', () => {
		const metadataA = createBaseSessionMetadata();
		const metadataB = createBaseSessionMetadata();
		const resourceKey = Object.keys(metadataA.resources ?? {})[0];
		expect(resourceKey).toBeDefined();
		if (!resourceKey) {
			return;
		}
		metadataA.resources![resourceKey]!.label = '__test__';
		expect(metadataB.resources?.[resourceKey]?.label).not.toBe('__test__');
	});
});
