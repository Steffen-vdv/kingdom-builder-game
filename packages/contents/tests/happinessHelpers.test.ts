import { statAddEffect, effect } from '../src/config/builders';
import { Types, ResourceMethods } from '../src/config/builderShared';
import { Stat, getStatResourceV2Id } from '../src/stats';
import { growthBonusEffect } from '../src/happinessHelpers';
import { resourceChange } from '../src/resourceV2';
import { describe, expect, it } from 'vitest';

describe('happiness helpers', () => {
	it('builds additive stat effects without altering rounding', () => {
		const amount = 0.2;
		const config = statAddEffect(Stat.growth, amount);
		const expected = effect(Types.Resource, ResourceMethods.ADD)
			.params(resourceChange(getStatResourceV2Id(Stat.growth)).amount(amount).build())
			.build();
		expect(config).toEqual(expected);
		expect(config.round).toBeUndefined();
	});

	it('delegates growth bonuses to the stat helper', () => {
		const amount = 0.75;
		expect(growthBonusEffect(amount)).toEqual(statAddEffect(Stat.growth, amount));
	});
});
