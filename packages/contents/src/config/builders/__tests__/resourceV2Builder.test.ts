import { describe, expect, it } from 'vitest';

import { resourceTier, resourceTierTrack, resourceV2 } from '../../builders/resourceV2Builder';

describe('ResourceV2Builder', () => {
	it('prevents setting order twice', () => {
		const builder = resourceV2().id('gold').name('Gold');
		builder.order(1);
		expect(() => builder.order(2)).toThrowError('ResourceV2 already set order(). Remove the extra order() call.');
	});

	it('requires bounds() to receive at least one value', () => {
		const builder = resourceV2().id('gold').name('Gold');
		expect(() => builder.bounds({})).toThrowError('bounds() requires at least lower or upper to be provided.');
	});

	it('prevents multiple tierTrack() calls on the same resource', () => {
		const builder = resourceV2().id('gold').name('Gold').order(1);
		builder.tierTrack((track) =>
			track
				.id('gold-track')
				.tier((tier) => tier.id('tier-1').range(0, 5))
				.tier((tier) => tier.id('tier-2').range(6, 10)),
		);
		expect(() => builder.tierTrack((track) => track.id('extra-track').tier((tier) => tier.id('tier-a').range(0, 1)))).toThrowError(
			'ResourceV2 already set tierTrack(). Remove the extra tierTrack() call.',
		);
	});
});

describe('ResourceV2TierTrackBuilder', () => {
	it('throws when tier ranges overlap or are unsorted', () => {
		const track = resourceTierTrack().id('test-track');
		track.tier((tier) => tier.id('low').range(0, 5));
		track.tier((tier) => tier.id('mid').range(4, 10));
		expect(() => track.build()).toThrowError('Tier "mid" overlaps or is out of order. Ensure tier ranges increase without overlap.');
	});

	it('allows non-overlapping tiers after sorting by min', () => {
		const track = resourceTierTrack().id('sorted-track').tier(resourceTier().id('mid').range(6, 10)).tier(resourceTier().id('low').range(0, 5));

		const result = track.build();

		expect(result.tiers.map((tier) => tier.id)).toEqual(['low', 'mid']);
	});
});
