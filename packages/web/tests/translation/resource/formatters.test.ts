import { describe, expect, it } from 'vitest';
import type {
	ResourceMetadataSnapshot,
	ResourceValueSnapshot,
} from '../../../src/translation/resource';
import {
	buildResourceHoverSections,
	buildResourceSignedGainEntries,
	formatResourceSummary,
} from '../../../src/translation/resource';

type OrderedResourceSnapshot = {
	metadata: ResourceMetadataSnapshot;
	snapshot: ResourceValueSnapshot;
	order: number;
};

function entry(
	metadata: ResourceMetadataSnapshot,
	snapshot: ResourceValueSnapshot,
	order: number,
): OrderedResourceSnapshot {
	return { metadata, snapshot, order };
}

function renderSummaries(entries: OrderedResourceSnapshot[]): string[] {
	return entries
		.slice()
		.sort((left, right) => left.order - right.order)
		.map(({ metadata, snapshot }) => formatResourceSummary(metadata, snapshot));
}

function collectSignedGains(entries: OrderedResourceSnapshot[]) {
	return entries
		.slice()
		.sort((left, right) => left.order - right.order)
		.flatMap(({ metadata, snapshot }) =>
			buildResourceSignedGainEntries(metadata, snapshot),
		);
}

describe('Resource formatters', () => {
	it('renders parent before child and respects percent-aware formatting', () => {
		const parent = entry(
			{
				id: 'resource:population',
				label: 'Population',
				icon: '🏰',
			},
			{
				id: 'resource:population',
				current: 30,
				previous: 20,
			},
			0,
		);
		const child = entry(
			{
				id: 'resource:legion',
				label: 'Legion',
				icon: '🛡️',
				displayAsPercent: true,
			},
			{
				id: 'resource:legion',
				current: 0.35,
				previous: 0.2,
			},
			1,
		);

		const summaries = renderSummaries([child, parent]);

		expect(summaries).toEqual([
			'🏰 Population +10 (20→30)',
			'🛡️ Legion +15% (20%→35%)',
		]);
	});

	it('emits ordered signed gains for parents and children', () => {
		const parent = entry(
			{
				id: 'resource:population',
				label: 'Population',
			},
			{
				id: 'resource:population',
				current: 12,
				previous: 10,
			},
			0,
		);
		const child = entry(
			{
				id: 'resource:legion',
				label: 'Legion',
			},
			{
				id: 'resource:legion',
				current: 7,
				previous: 9,
			},
			1,
		);

		const gains = collectSignedGains([child, parent]);

		expect(gains).toEqual([
			{ key: 'resource:population', amount: 2 },
			{ key: 'resource:legion', amount: -2 },
		]);
	});

	it('builds hover sections with deterministic ordering and percent-aware entries', () => {
		const metadata: ResourceMetadataSnapshot = {
			id: 'resource:legion',
			label: 'Legion',
			description: 'Veteran soldiers ready for combat.',
			displayAsPercent: true,
		};
		const snapshot: ResourceValueSnapshot = {
			id: 'resource:legion',
			current: 0.45,
			previous: 0.4,
			forecastDelta: -0.05,
			lowerBound: 0.1,
			upperBound: 0.9,
		};

		const sections = buildResourceHoverSections(metadata, snapshot);

		expect(sections).toMatchInlineSnapshot(`
  [
    "Veteran soldiers ready for combat.",
    {
      "_hoist": true,
      "items": [
        "Current: 45%",
        "Previous: 40%",
        "Change: +5%",
        "Forecast: -5%",
      ],
      "title": "Value",
    },
    {
      "items": [
        "Lower bound: 10%",
        "Upper bound: 90%",
      ],
      "title": "Bounds",
    },
  ]
`);
	});
});
