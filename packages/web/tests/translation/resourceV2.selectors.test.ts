import { describe, expect, it } from 'vitest';
import type { TranslationAssets } from '../src/translation/context';
import {
	createTranslationResourceV2Registry,
	resourceV2DisplaysAsPercent,
	selectResourceV2Bounds,
	selectResourceV2TierTrack,
	selectResourceV2GlobalCostLabel,
} from '../src/translation/resourceV2';

const tierTrack = Object.freeze({
	id: 'absorption-track',
	tiers: Object.freeze([
		Object.freeze({
			id: 'steady',
			range: Object.freeze({ min: 0, max: 5 }),
		}),
		Object.freeze({
			id: 'surging',
			range: Object.freeze({ min: 5 }),
		}),
	]),
});

const parentTierTrack = Object.freeze({
	id: 'morale-track',
	tiers: Object.freeze([
		Object.freeze({
			id: 'stable',
			range: Object.freeze({ min: 0, max: 50 }),
		}),
		Object.freeze({
			id: 'inspired',
			range: Object.freeze({ min: 50 }),
		}),
	]),
});

const registry = createTranslationResourceV2Registry(
	[
		{
			id: 'absorption',
			display: {
				name: 'Absorption',
				icon: '🌀',
				description: 'Reduces incoming damage.',
				order: 1,
				displayAsPercent: true,
			},
			bounds: { lowerBound: 0, upperBound: 10 },
			tierTrack,
			globalActionCost: { amount: 1 },
		},
		{
			id: 'happiness',
			display: {
				name: 'Happiness',
				order: 2,
			},
			group: { groupId: 'morale-group', order: 1 },
		},
	],
	[
		{
			id: 'morale-group',
			order: 1,
			parent: {
				id: 'morale-parent',
				display: {
					name: 'Morale',
					icon: '🎭',
					description: 'Overall morale of the ' + 'realm.',
					order: 1,
					displayAsPercent: true,
				},
				bounds: { lowerBound: 0, upperBound: 100 },
				tierTrack: parentTierTrack,
				relation: 'sumOfAll',
			},
			children: ['happiness'],
		},
	],
);

const baseAssets: TranslationAssets = {
	resources: Object.freeze({
		legacy: Object.freeze({
			label: 'Legacy Resource',
			icon: '📦',
			displayAsPercent: true,
		}),
	}),
	stats: Object.freeze({}),
	populations: Object.freeze({}),
	population: Object.freeze({ label: 'Population' }),
	land: Object.freeze({ label: 'Land' }),
	slot: Object.freeze({ label: 'Slot' }),
	passive: Object.freeze({ label: 'Passive' }),
	transfer: Object.freeze({ label: 'Transfer' }),
	upkeep: Object.freeze({ label: 'Upkeep' }),
	modifiers: Object.freeze({}),
	triggers: Object.freeze({}),
	tierSummaries: Object.freeze({}),
	formatPassiveRemoval: (description: string) => description,
};

describe('resourceV2 selectors', () => {
	it(
		'detects percent formatting from resource definitions ' + 'and parents',
		() => {
			expect(
				resourceV2DisplaysAsPercent({ resourceV2: registry }, 'absorption'),
			).toBe(true);
			expect(
				resourceV2DisplaysAsPercent({ resourceV2: registry }, 'happiness'),
			).toBe(true);
			expect(
				resourceV2DisplaysAsPercent({ assets: baseAssets }, 'legacy'),
			).toBe(true);
			expect(
				resourceV2DisplaysAsPercent({ resourceV2: registry }, 'unknown'),
			).toBe(false);
		},
	);

	it('resolves bounds with parent fallback', () => {
		expect(
			selectResourceV2Bounds({ resourceV2: registry }, 'absorption'),
		).toEqual({
			lowerBound: 0,
			upperBound: 10,
		});
		expect(
			selectResourceV2Bounds({ resourceV2: registry }, 'happiness'),
		).toEqual({
			lowerBound: 0,
			upperBound: 100,
		});
		expect(
			selectResourceV2Bounds({ resourceV2: registry }, 'unknown'),
		).toBeUndefined();
	});

	it('resolves tier tracks with parent fallback', () => {
		expect(
			selectResourceV2TierTrack({ resourceV2: registry }, 'absorption'),
		).toBe(tierTrack);
		expect(
			selectResourceV2TierTrack({ resourceV2: registry }, 'happiness'),
		).toBe(parentTierTrack);
		expect(
			selectResourceV2TierTrack({ resourceV2: registry }, 'unknown'),
		).toBeUndefined();
	});

	it('formats global cost labels from ResourceV2 metadata', () => {
		const costLabel = selectResourceV2GlobalCostLabel(
			{ resourceV2: registry },
			'absorption',
		);
		expect(costLabel).toEqual({
			label: 'Absorption',
			icon: '🌀',
			amount: 1,
		});
	});

	it('falls back to assets when ResourceV2 data is missing', () => {
		const label = selectResourceV2GlobalCostLabel(
			{ assets: baseAssets },
			'legacy',
		);
		expect(label).toEqual({
			label: 'Legacy Resource',
			icon: '📦',
		});
	});
});
