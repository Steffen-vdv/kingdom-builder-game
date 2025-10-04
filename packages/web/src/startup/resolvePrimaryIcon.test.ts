import { describe, expect, it } from 'vitest';
import { PRIMARY_ICON_ID, RESOURCES } from '@kingdom-builder/contents';
import { resolvePrimaryIcon } from './resolvePrimaryIcon';

describe('resolvePrimaryIcon', () => {
	it('returns the configured resource icon when available', () => {
		const resolved = resolvePrimaryIcon(RESOURCES, PRIMARY_ICON_ID);
		expect(resolved).toBe(RESOURCES[PRIMARY_ICON_ID].icon);
	});

	it('falls back to the first available resource icon when missing', () => {
		const fallbackEntry = Object.entries(RESOURCES)[0];
		if (!fallbackEntry) {
			throw new Error('Expected at least one resource to be defined.');
		}
		const [, fallbackResource] = fallbackEntry;
		const resolved = resolvePrimaryIcon(RESOURCES, 'non-existent');
		expect(resolved).toBe(fallbackResource.icon);
	});
});
