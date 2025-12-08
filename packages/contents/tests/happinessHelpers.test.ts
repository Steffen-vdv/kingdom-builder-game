import { developmentTarget, effect, passiveParams, resultModParams, statAddEffect } from '../src/config/builders';
import { PassiveMethods, ResourceMethods, ResultModMethods, Types } from '../src/config/builderShared';
import { EvaluationTargetTypes } from '../src/config/builders/advancedEffectParams';
import { DevelopmentId } from '../src/developments';
import { createTierPassiveEffect, growthBonusEffect, happinessTierId } from '../src/happinessHelpers';
import { Resource } from '../src/resources';
import { Stat, getStatResourceId } from '../src/stats';
import { resourceChange } from '../src/resource';
import { describe, expect, it } from 'vitest';

describe('happiness helpers', () => {
	it('builds additive stat effects without altering rounding', () => {
		const amount = 0.2;
		const config = statAddEffect(Stat.growth, amount);
		const expected = effect(Types.Resource, ResourceMethods.ADD)
			.params(resourceChange(getStatResourceId(Stat.growth)).amount(amount).build())
			.build();
		expect(config).toEqual(expected);
		expect(config.round).toBeUndefined();
	});

	it('delegates growth bonuses to the stat helper', () => {
		const amount = 0.75;
		expect(growthBonusEffect(amount)).toEqual(statAddEffect(Stat.growth, amount));
	});

	it('provides isolated development evaluation builders for result modifiers', () => {
		const firstParams = resultModParams().id('first_development_bonus').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(1).build();
		const secondParams = resultModParams().id('second_development_bonus').evaluation(developmentTarget().id(DevelopmentId.House)).amount(2).build();
		expect(firstParams.evaluation).toEqual({
			type: EvaluationTargetTypes.Development,
			id: DevelopmentId.Farm,
		});
		expect(secondParams.evaluation).toEqual({
			type: EvaluationTargetTypes.Development,
			id: DevelopmentId.House,
		});
	});

	it('builds tier passive effects with development evaluation payloads', () => {
		const tierTrackMetadata = { id: 'resource:core:happiness', label: 'Happiness' };
		const tierId = happinessTierId('steady');
		const passive = passiveParams().id('passive:happiness:steady');
		const nestedResult = effect(Types.ResultMod, ResultModMethods.ADD)
			.params(resultModParams().id('steady_development_bonus').evaluation(developmentTarget().id(DevelopmentId.Farm)).amount(3).build())
			.build();
		const builder = createTierPassiveEffect({
			tierId,
			resourceId: Resource.happiness,
			tierTrackMetadata,
			summary: 'Steady gains',
			removalDetail: 'Lose steady gains',
			params: passive,
			effects: [nestedResult],
		});
		const config = builder.build();
		expect(config.type).toBe(Types.Passive);
		expect(config.method).toBe(PassiveMethods.ADD);
		expect(config.params).toMatchObject({
			id: 'passive:happiness:steady',
			detail: 'Steady gains',
			meta: {
				resourceId: Resource.happiness,
				tierId,
				tierTrack: tierTrackMetadata,
			},
		});
		expect(config.effects).toBeDefined();
		expect(config.effects).toHaveLength(1);
		expect(config.effects?.[0]?.params?.evaluation).toEqual({
			type: EvaluationTargetTypes.Development,
			id: DevelopmentId.Farm,
		});
	});
});
