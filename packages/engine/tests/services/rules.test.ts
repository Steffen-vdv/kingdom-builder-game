import { describe, it, expect } from 'vitest';
import { Services } from '../../src/services';
import {
	RULES,
	happinessTier,
	effect,
	passiveParams,
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';

describe('Services', () => {
	it('evaluates resource tiers correctly', () => {
		const services = new Services(RULES, createContentFactory().developments);
		const getTierEffect = (value: number) =>
			RULES.tierDefinitions
				.filter(
					(t) =>
						value >= t.range.min &&
						(t.range.max === undefined || value <= t.range.max),
				)
				.at(-1)?.effect || {};
		expect(services.tieredResource.tier(0)?.incomeMultiplier).toBe(
			getTierEffect(0).incomeMultiplier,
		);
		expect(services.tieredResource.tier(4)?.incomeMultiplier).toBe(
			getTierEffect(4).incomeMultiplier,
		);
		expect(services.tieredResource.tier(5)?.buildingDiscountPct).toBe(
			getTierEffect(5).buildingDiscountPct,
		);
		expect(services.tieredResource.tier(8)?.incomeMultiplier).toBe(
			getTierEffect(8).incomeMultiplier,
		);
	});

	it('honours inclusive range maximums for tier selection', () => {
		const content = createContentFactory();
		const services = new Services(
			{
				...RULES,
				tierDefinitions: [
					happinessTier('test:tier:low')
						.range(0, 5)
						.incomeMultiplier(1)
						.passive(
							effect()
								.type(Types.Passive)
								.method(PassiveMethods.ADD)
								.params(passiveParams().id('test:passive:low').build()),
						)
						.build(),
					happinessTier('test:tier:high')
						.range(6)
						.incomeMultiplier(2)
						.passive(
							effect()
								.type(Types.Passive)
								.method(PassiveMethods.ADD)
								.params(passiveParams().id('test:passive:high').build()),
						)
						.build(),
				],
			},
			content.developments,
		);
		expect(services.tieredResource.tier(5)?.incomeMultiplier).toBe(1);
		expect(services.tieredResource.tier(6)?.incomeMultiplier).toBe(2);
	});
});
