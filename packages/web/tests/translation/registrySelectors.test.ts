import { describe, expect, it } from 'vitest';
import { selectStatDescriptor } from '../../src/translation/effects/registrySelectors';
import type { TranslationAssets } from '../../src/translation/context';
import { createResourceV2Selectors } from '../../src/translation/resourceV2/selectors';

type AssetOverrides = Partial<TranslationAssets> & {
	stats?: TranslationAssets['stats'];
	resourceV2?: TranslationAssets['resourceV2'];
};

function createAssets(overrides: AssetOverrides = {}): TranslationAssets {
	return {
		resources: overrides.resources ?? {},
		stats: overrides.stats ?? {},
		populations: overrides.populations ?? {},
		population: overrides.population ?? {},
		land: overrides.land ?? {},
		slot: overrides.slot ?? {},
		passive: overrides.passive ?? {},
		upkeep: overrides.upkeep ?? {},
		modifiers: overrides.modifiers ?? {},
		triggers: overrides.triggers ?? {},
		tierSummaries: overrides.tierSummaries ?? {},
		formatPassiveRemoval:
			overrides.formatPassiveRemoval ?? ((description: string) => description),
		resourceV2: overrides.resourceV2 ?? createResourceV2Selectors(),
	} as TranslationAssets;
}

function createContext(overrides: AssetOverrides = {}) {
	return { assets: createAssets(overrides) };
}

describe('registrySelectors – selectStatDescriptor', () => {
	it('prefers translation asset metadata and clones format descriptors', () => {
		const statKey = 'stat.max';
		const metadataFormat = Object.freeze({ prefix: 'Max ' });
		const stats = {
			[statKey]: Object.freeze({
				label: 'Maximum',
				icon: '🔺',
				format: metadataFormat,
			}),
		} satisfies TranslationAssets['stats'];
		const context = createContext({ stats });
		const descriptor = selectStatDescriptor(context, statKey);
		expect(descriptor.label).toBe('Maximum');
		expect(descriptor.icon).toBe('🔺');
		expect(descriptor.format).toEqual({ prefix: 'Max ' });
		expect(descriptor.format).not.toBe(metadataFormat);
		const cached = selectStatDescriptor(context, statKey);
		expect(cached).toBe(descriptor);
	});

	it('derives percent formatting hints from metadata flags', () => {
		const statKey = 'stat.percent';
		const stats = {
			[statKey]: Object.freeze({
				label: 'Percentile',
				icon: '📈',
				displayAsPercent: true,
			}),
		} satisfies TranslationAssets['stats'];
		const context = createContext({ stats });
		const descriptor = selectStatDescriptor(context, statKey);
		expect(descriptor.format).toEqual({ percent: true });
	});

	it('falls back to humanized identifiers and maintains per-context caches', () => {
		const statKey = 'mystery-stat';
		const context = createContext();
		const descriptor = selectStatDescriptor(context, statKey);
		expect(descriptor.label).toBe('Mystery Stat');
		expect(descriptor.icon).toBe(statKey);
		const repeat = selectStatDescriptor(context, statKey);
		expect(repeat).toBe(descriptor);
		const otherContext = createContext();
		const otherDescriptor = selectStatDescriptor(otherContext, statKey);
		expect(otherDescriptor).not.toBe(descriptor);
		expect(otherDescriptor.label).toBe(descriptor.label);
	});
});
