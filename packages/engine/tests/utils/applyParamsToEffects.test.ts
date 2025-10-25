import { describe, it, expect } from 'vitest';
import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { Resource } from '../../src/state/index.ts';

describe('applyParamsToEffects', () => {
	it('replaces placeholders in params, evaluator and nested effects', () => {
		const effects = [
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: '$resourceId',
					change: '$change',
				},
				evaluator: { type: 'dummy', params: { times: '$count' } },
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: '$nestedResourceId',
							change: '$nestedChange',
						},
					},
				],
			},
		];
		const params = {
			resourceId: Resource.gold,
			change: { type: 'amount', amount: 2 },
			count: 3,
			nestedResourceId: Resource.ap,
			nestedChange: { type: 'amount', amount: 1 },
		};
		const applied = applyParamsToEffects(effects, params);
		const effect = applied[0]!;
		expect(effect.params?.resourceId).toBe(params.resourceId);
		expect(effect.params?.change).toEqual(params.change);
		expect(effect.evaluator?.params?.times).toBe(params.count);
		expect(effect.effects?.[0]?.params?.resourceId).toBe(
			params.nestedResourceId,
		);
		expect(effect.effects?.[0]?.params?.change).toEqual(params.nestedChange);
	});

	it('leaves non-placeholder strings untouched', () => {
		const effects = [
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: 'static',
					change: '$amount',
				},
			},
		];
		const applied = applyParamsToEffects(effects, {
			amount: { type: 'amount', amount: 5 },
		});
		expect(applied[0]?.params?.resourceId).toBe('static');
		expect(applied[0]?.params?.change).toEqual({ type: 'amount', amount: 5 });
	});
});
