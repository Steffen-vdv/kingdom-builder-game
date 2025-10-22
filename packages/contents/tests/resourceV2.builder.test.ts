import { describe, expect, it } from 'vitest';

import { effect, resourceV2Definition, resourceV2Effect, resourceV2GroupParent, resourceV2Tier, resourceV2TierTrack } from '../src/config/builders';
import { ResourceMethods, Types } from '../src/config/builderShared';

describe('resourceV2 builders', () => {
	it('captures display metadata and global action cost', () => {
		const definition = resourceV2Definition('absorption')
			.name('Absorption')
			.order(1)
			.displayAsPercent()
			.trackValueBreakdown()
			.trackBoundBreakdown()
			.lowerBound(0)
			.upperBound(100)
			.group('population', 2)
			.globalActionCost(3)
			.build();

		expect(definition.display).toEqual({
			name: 'Absorption',
			order: 1,
			displayAsPercent: true,
		});
		expect(definition.trackValueBreakdown).toBe(true);
		expect(definition.trackBoundBreakdown).toBe(true);
		expect(definition.bounds).toEqual({ lowerBound: 0, upperBound: 100 });
		expect(definition.group).toEqual({ groupId: 'population', order: 2 });
		expect(definition.globalActionCost).toEqual({ amount: 3 });
	});

	it('prevents assigning multiple tier tracks to the same resource', () => {
		const track = resourceV2TierTrack('absorption-track').tier(resourceV2Tier('steady').range(0, 10).build()).build();

		const builder = resourceV2Definition('absorption').name('Absorption').order(1);
		builder.tierTrack(track);

		expect(() => builder.tierTrack(track)).toThrow('Resource already set tierTrack(). Remove the extra tierTrack() call.');
	});

	it('prevents assigning multiple tier tracks to the same resource group parent', () => {
		const track = resourceV2TierTrack('population-track').tier(resourceV2Tier('population-tier').range(0, 5));

		const builder = resourceV2GroupParent('population').name('Population').order(1).tierTrack(track);

		expect(() => builder.tierTrack(track)).toThrow('Group parent already set tierTrack(). Remove the extra tierTrack() call.');
	});

	it('wraps resource effects with clamp reconciliation and optional hook suppression', () => {
		const addEffect = effect(Types.Resource, ResourceMethods.ADD).param('key', 'absorption').param('amount', 2).build();

		const wrapped = resourceV2Effect(addEffect);
		expect(addEffect.meta).toBeUndefined();
		expect(wrapped.meta).toEqual({
			resourceV2: { reconciliation: 'clamp' },
		});

		const tier = resourceV2Tier('steady').range(0, 10).enterEffect(addEffect).enterEffect(addEffect, { suppressHooks: true }).build();

		const [first, second] = tier.enterEffects ?? [];
		expect(first?.meta).toEqual({ resourceV2: { reconciliation: 'clamp' } });
		expect(second?.meta).toEqual({
			resourceV2: { reconciliation: 'clamp', suppressHooks: true },
		});
	});

	it('rejects non-positive global action cost values', () => {
		const builder = resourceV2Definition('absorption').name('Absorption').order(1);
		expect(() => builder.globalActionCost(0)).toThrow('Global action cost amount(...) must be greater than zero.');
	});
});
