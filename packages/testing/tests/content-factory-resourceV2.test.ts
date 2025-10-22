import { describe, expect, it } from 'vitest';

import {
	ResourceV2TierBuilder,
	ResourceV2TierTrackBuilder,
} from '@kingdom-builder/contents/config/builders';
import { createContentFactory } from '@kingdom-builder/testing';

describe('content factory ResourceV2 helpers', () => {
	it('applies bounds and tier track information when generating ResourceV2 definitions', () => {
		const factory = createContentFactory();

		const definition = factory.resourceV2({
			id: 'synthetic-resource',
			name: 'Synthetic Resource',
			lowerBound: 2,
			upperBound: 10,
			tierTrack: (track) =>
				track
					.id('synthetic-track')
					.title('Synthetic Track')
					.tier((tier) => tier.id('tier-one').range(0, 4))
					.tier(new ResourceV2TierBuilder().id('tier-two').range(5, 10)),
		});

		expect(definition.lowerBound).toBe(2);
		expect(definition.upperBound).toBe(10);
		expect(definition.tierTrack?.id).toBe('synthetic-track');
		expect(definition.tierTrack?.tiers).toEqual([
			expect.objectContaining({ id: 'tier-one', range: { min: 0, max: 4 } }),
			expect.objectContaining({ id: 'tier-two', range: { min: 5, max: 10 } }),
		]);
		expect(factory.resourcesV2.get(definition.id)).toBe(definition);
	});

	it('respects explicit ordering and increments subsequent ResourceV2 definitions sequentially', () => {
		const factory = createContentFactory();
		const baseOrders = factory.resourcesV2
			.values()
			.map((resource) => resource.order);
		const highestBaseOrder = baseOrders.length ? Math.max(...baseOrders) : -1;

		const explicit = factory.resourceV2({
			id: 'ordered-resource',
			name: 'Ordered Resource',
			order: 73,
		});

		expect(explicit.order).toBe(73);

		const auto = factory.resourceV2({
			id: 'auto-resource',
			name: 'Auto Resource',
		});

		expect(auto.order).toBe(highestBaseOrder + 1);
		expect(factory.resourcesV2.get(auto.id)).toBe(auto);
	});

	it('accepts prebuilt tier tracks without mutating the supplied structure', () => {
		const factory = createContentFactory();
		const trackBuilder = new ResourceV2TierTrackBuilder()
			.id('immutable-track')
			.tier((tier) => tier.id('tier-a').range(0, 3))
			.tier((tier) => tier.id('tier-b').range(4));
		const builtTrack = trackBuilder.build();

		const definition = factory.resourceV2({
			id: 'immutable-resource',
			name: 'Immutable Resource',
			order: 99,
			tierTrack: builtTrack,
		});

		expect(definition.tierTrack).not.toBe(builtTrack);
		expect(definition.tierTrack?.tiers).toEqual(builtTrack.tiers);
		expect(trackBuilder.build().tiers).toEqual(builtTrack.tiers);
	});
});
