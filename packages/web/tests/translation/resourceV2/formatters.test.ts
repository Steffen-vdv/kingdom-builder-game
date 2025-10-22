import { describe, expect, it } from 'vitest';
import type {
	ResourceV2MetadataSnapshot,
	ResourceV2ValueSnapshot,
} from '../../../src/translation/resourceV2';
import {
	buildResourceV2HoverSections,
	buildResourceV2SignedGainEntries,
	formatResourceV2Summary,
} from '../../../src/translation/resourceV2';

describe('ResourceV2 formatters', () => {
	const metadata = (overrides: Partial<ResourceV2MetadataSnapshot> = {}) => {
		return {
			id: 'resource:gold',
			label: 'Royal Treasury',
			icon: '💰',
			description: 'Gold reserves used for most upgrades.',
			displayAsPercent: false,
			...overrides,
		};
	};

	const snapshot = (
		overrides: Partial<ResourceV2ValueSnapshot> = {},
	): ResourceV2ValueSnapshot => ({
		id: 'resource:gold',
		current: 12,
		previous: 10,
		lowerBound: 0,
		upperBound: null,
		forecastDelta: 2,
		...overrides,
	});

	it('formats summary with signed delta and bounds-aware value text', () => {
		const summary = formatResourceV2Summary(metadata(), snapshot());
		expect(summary).toBe('💰 Royal Treasury +2 (10→12)');
	});

	it('formats percent-aware values when metadata toggles displayAsPercent', () => {
		const percentMetadata = metadata({ displayAsPercent: true });
		const percentSnapshot = snapshot({ current: 0.55, previous: 0.5 });
		const summary = formatResourceV2Summary(percentMetadata, percentSnapshot);
		expect(summary).toBe('💰 Royal Treasury +5% (50%→55%)');
	});

	it('falls back to current value when delta cannot be derived', () => {
		const summary = formatResourceV2Summary(
			metadata(),
			snapshot({ previous: undefined }),
		);
		expect(summary).toBe('💰 Royal Treasury 12');
	});

	it('builds hover sections with description, value details, and bounds', () => {
		const sections = buildResourceV2HoverSections(metadata(), snapshot());
		expect(sections).toMatchInlineSnapshot(`
  [
    "Gold reserves used for most upgrades.",
    {
      "_hoist": true,
      "items": [
        "Current: 12",
        "Previous: 10",
        "Change: +2",
        "Forecast: +2",
      ],
      "title": "Value",
    },
    {
      "items": [
        "Lower bound: 0",
      ],
      "title": "Bounds",
    },
  ]
`);
	});

	it('skips signed gain entries when delta is zero', () => {
		const entries = buildResourceV2SignedGainEntries(
			metadata(),
			snapshot({ current: 10, previous: 10 }),
		);
		expect(entries).toEqual([]);
	});

	it('emits signed gain entries for both gains and losses', () => {
		const gainEntries = buildResourceV2SignedGainEntries(
			metadata(),
			snapshot(),
		);
		expect(gainEntries).toEqual([{ key: 'resource:gold', amount: 2 }]);
		const lossEntries = buildResourceV2SignedGainEntries(
			metadata(),
			snapshot({ current: 7, previous: 10 }),
		);
		expect(lossEntries).toEqual([{ key: 'resource:gold', amount: -3 }]);
	});
});
