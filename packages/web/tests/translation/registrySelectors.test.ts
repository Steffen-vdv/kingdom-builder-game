import { describe, expect, it } from 'vitest';
import { selectStatDescriptor } from '../../src/translation/effects/registrySelectors';
import type { TranslationAssets } from '../../src/translation/context';

type ResourceV2Metadata = {
	id: string;
	label?: string;
	icon?: string;
	displayAsPercent?: boolean;
};

type ResourceMetadataV2Selectors = {
	get: (id: string) => ResourceV2Metadata;
	has: (id: string) => boolean;
	list: () => ResourceV2Metadata[];
};

function createAssets(): TranslationAssets {
	return {
		resources: {},
		stats: {},
		populations: {},
		population: {},
		land: {},
		slot: {},
		passive: {},
		upkeep: {},
		modifiers: {},
		triggers: {},
		tierSummaries: {},
		formatPassiveRemoval: (description: string) => description,
	} as TranslationAssets;
}

function createResourceMetadataV2(
	entries: Record<string, Omit<ResourceV2Metadata, 'id'>>,
): ResourceMetadataV2Selectors {
	const data = Object.entries(entries).map(([id, meta]) => ({ id, ...meta }));
	return {
		get: (id: string) => {
			const entry = data.find((e) => e.id === id);
			return entry ?? { id, label: id };
		},
		has: (id: string) => data.some((e) => e.id === id),
		list: () => data,
	};
}

function createContext(
	v2Entries: Record<string, Omit<ResourceV2Metadata, 'id'>> = {},
) {
	return {
		assets: createAssets(),
		resourceMetadataV2: createResourceMetadataV2(v2Entries),
	};
}

describe('registrySelectors – selectStatDescriptor', () => {
	it('uses ResourceV2 metadata for labels and icons', () => {
		const resourceId = 'resource:core:max-value';
		const context = createContext({
			[resourceId]: {
				label: 'Maximum',
				icon: '🔺',
			},
		});
		const descriptor = selectStatDescriptor(context, resourceId);
		expect(descriptor.label).toBe('Maximum');
		expect(descriptor.icon).toBe('🔺');
		const cached = selectStatDescriptor(context, resourceId);
		expect(cached).toBe(descriptor);
	});

	it('derives percent formatting from V2 displayAsPercent property', () => {
		const resourceId = 'resource:core:percent-value';
		const context = createContext({
			[resourceId]: {
				label: 'Percentile',
				icon: '📈',
				displayAsPercent: true,
			},
		});
		const descriptor = selectStatDescriptor(context, resourceId);
		expect(descriptor.format).toEqual({ percent: true });
	});

	it('falls back to V2 metadata default label and maintains per-context caches', () => {
		const resourceId = 'mystery-stat';
		const context = createContext();
		const descriptor = selectStatDescriptor(context, resourceId);
		// V2 metadata returns id as label for unknown resources
		expect(descriptor.label).toBe('mystery-stat');
		// Icon falls back to empty string when not found
		expect(descriptor.icon).toBe('');
		const repeat = selectStatDescriptor(context, resourceId);
		expect(repeat).toBe(descriptor);
		const otherContext = createContext();
		const otherDescriptor = selectStatDescriptor(otherContext, resourceId);
		expect(otherDescriptor).not.toBe(descriptor);
		expect(otherDescriptor.label).toBe(descriptor.label);
	});
});
