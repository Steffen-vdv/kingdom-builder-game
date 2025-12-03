import { describe, it, expect } from 'vitest';
import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { getResourceV2Id, Resource } from '@kingdom-builder/contents';

describe('applyParamsToEffects', () => {
	it('replaces placeholders in params, evaluator and nested effects', () => {
		const effects = [
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: '$resourceId',
					change: { type: 'amount', amount: '$amount' },
				},
				evaluator: { type: 'dummy', params: { times: '$count' } },
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: '$nestedResourceId',
							change: { type: 'amount', amount: '$nestedAmount' },
						},
					},
				],
			},
		];
		const params = {
			resourceId: getResourceV2Id(Resource.gold),
			amount: 2,
			count: 3,
			nestedResourceId: getResourceV2Id(Resource.ap),
			nestedAmount: 1,
		};
		const applied = applyParamsToEffects(effects, params);
		const effect = applied[0]!;
		expect(effect.params?.resourceId).toBe(params.resourceId);
		expect(effect.params?.change?.amount).toBe(params.amount);
		expect(effect.evaluator?.params?.times).toBe(params.count);
		expect(effect.effects?.[0]?.params?.resourceId).toBe(
			params.nestedResourceId,
		);
		expect(effect.effects?.[0]?.params?.change?.amount).toBe(
			params.nestedAmount,
		);
	});

	it('leaves non-placeholder strings untouched', () => {
		const effects = [
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: 'resource:static',
					change: { type: 'amount', amount: '$amount' },
				},
			},
		];
		const applied = applyParamsToEffects(effects, { amount: 5 });
		expect(applied[0]?.params?.resourceId).toBe('resource:static');
		expect(applied[0]?.params?.change?.amount).toBe(5);
	});
});
