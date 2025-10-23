import { statAddEffect, effect } from '../src/config/builders';
import { Types, ResourceV2Methods } from '../src/config/builderShared';
import { resourceChange } from '../src/resourceV2';
import { getStatResourceV2Id, Stat } from '../src/stats';
import { growthBonusEffect } from '../src/happinessHelpers';
import { describe, expect, it } from 'vitest';

describe('happiness helpers', () => {
	it('builds additive stat effects without altering rounding', () => {
		const amount = 0.2;
		const config = statAddEffect(Stat.growth, amount);
		const resourceId = getStatResourceV2Id(Stat.growth);
		const expected = effect(Types.ResourceV2, ResourceV2Methods.ADD).params(resourceChange(resourceId).amount(amount).build()).build();
		expect(config).toEqual(expected);
		expect(config.round).toBeUndefined();
	});

	it('delegates growth bonuses to the stat helper', () => {
		const amount = 0.75;
		expect(growthBonusEffect(amount)).toEqual(statAddEffect(Stat.growth, amount));
	});
});
