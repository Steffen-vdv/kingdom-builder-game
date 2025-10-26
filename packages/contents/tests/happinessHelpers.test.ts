import { statAddEffect, effect, developmentTarget, resultModParams, passiveParams } from '../src/config/builders';
import { Types, ResourceMethods, ResultModMethods, PassiveMethods } from '../src/config/builderShared';
import { Stat, getStatResourceV2Id } from '../src/stats';
import { growthBonusEffect, createTierPassiveEffect } from '../src/happinessHelpers';
import { resourceChange } from '../src/resourceV2';
import type { ResourceV2TierTrackMetadata } from '../src/resourceV2';
import { describe, expect, it } from 'vitest';

const TIER_TRACK: ResourceV2TierTrackMetadata = { id: 'resource:happiness', label: 'Happiness' };

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

	it('builds independent development evaluation params', () => {
		const params = resultModParams().id('income_mod').evaluation(developmentTarget().id('development:test')).amount(2).build();

		expect(params.evaluation).toEqual({ type: 'development', id: 'development:test' });

		const second = developmentTarget().build();
		expect(second).toEqual({ type: 'development' });
	});

	it('creates tier passive effects with metadata and nested evaluations', () => {
		const nestedParams = resultModParams().id('tier_income').evaluation(developmentTarget()).amount(1).build();
		const nestedEffect = effect(Types.ResultMod, ResultModMethods.ADD).params(nestedParams).build();

		const builder = createTierPassiveEffect({
			tierId: 'happiness:tier:joyful',
			resourceId: 'resource:happiness',
			tierTrackMetadata: TIER_TRACK,
			summary: 'Gain joy',
			summaryToken: 'passive.summary.joy',
			removalDetail: 'you keep celebrating',
			params: passiveParams().id('passive:happiness:joy'),
			effects: [nestedEffect],
			icon: '😊',
			name: 'Joyful Citizens',
		});

		const config = builder.build();

		expect(config).toEqual({
			type: Types.Passive,
			method: PassiveMethods.ADD,
			params: {
				id: 'passive:happiness:joy',
				detail: 'passive.summary.joy',
				icon: '😊',
				name: 'Joyful Citizens',
				meta: {
					resourceId: 'resource:happiness',
					tierTrack: TIER_TRACK,
					tierId: 'happiness:tier:joyful',
					source: {
						type: 'tiered-resource',
						id: 'happiness:tier:joyful',
						labelToken: 'passive.summary.joy',
						icon: '😊',
					},
					removal: {
						token: 'you keep celebrating',
						text: 'Active as long as you keep celebrating',
					},
				},
			},
			effects: [nestedEffect],
		});

		expect(config.effects?.[0]).toEqual(nestedEffect);
		expect(nestedParams.evaluation).toEqual({ type: 'development' });
	});
});
