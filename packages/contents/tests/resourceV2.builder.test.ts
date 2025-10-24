import { describe, expect, it } from 'vitest';

import { resourceV2Add, resourceV2Definition, resourceV2Tier, resourceV2TierTrack } from '../src/config/builders';
import { ResourceV2Id } from '../src/resourceV2';

describe('ResourceV2 builders', () => {
	it('enforces a single tier track per resource', () => {
		const tierTrack = resourceV2TierTrack('absorption-track')
			.tierWith('steady', (tier) => tier.range(0, 10))
			.build();

		const builder = resourceV2Definition(ResourceV2Id.Absorption).name('Absorption').order(1).tierTrack(tierTrack);

		expect(() => builder.tierTrack(tierTrack)).toThrowError('Resource already configured tierTrack(). Remove the duplicate tierTrack() call.');
	});

	it('clamps reconciliation to clamp', () => {
		const builder = resourceV2Add(ResourceV2Id.Absorption).amount(1);

		expect(() => builder.reconciliation('pass' as never)).toThrowError('ResourceV2 change builder only supports clamp reconciliation during MVP.');

		const effect = builder.build();

		expect(effect.meta).toEqual({ reconciliation: 'clamp' });
	});

	it('serializes percent flags, hook suppression, and global cost metadata', () => {
		const effect = resourceV2Add(ResourceV2Id.Absorption).percent(25, 'down').suppressHooks('Prevents recursive gain hooks when auto-adjusting children.').build();

		expect(effect.params).toEqual({ id: ResourceV2Id.Absorption, percent: 25 });
		expect(effect.round).toBe('down');
		expect(effect.meta).toEqual({
			reconciliation: 'clamp',
			suppressHooks: { reason: 'Prevents recursive gain hooks when auto-adjusting children.' },
			usesPercent: true,
		});

		const definition = resourceV2Definition(ResourceV2Id.Absorption).name('Absorption').order(2).displayAsPercent().globalActionCost(3).build();

		expect(definition.display.displayAsPercent).toBe(true);
		expect(definition.globalActionCost).toEqual({ amount: 3 });
	});

	it('builds tier definitions with nested effects', () => {
		const tier = resourceV2Tier('steady').range(0, 10).enter(resourceV2Add(ResourceV2Id.Absorption).amount(1).build()).build();

		expect(tier).toEqual({
			id: 'steady',
			range: { min: 0, max: 10 },
			enterEffects: [
				{
					type: 'resource',
					method: 'add',
					params: { id: ResourceV2Id.Absorption, amount: 1 },
					meta: { reconciliation: 'clamp' },
				},
			],
		});
	});
});
