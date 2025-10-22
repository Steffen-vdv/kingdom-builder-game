import { describe, expect, it } from 'vitest';

import { ResourceV2ReconciliationStrategy, ResourceV2RoundingMode } from '../../../resourceV2';
import { resourceAddEffect, resourceRemoveEffect, resourceTransferEffect, resourceUpperBoundIncreaseEffect } from '../evaluators/effectBuilder';
import { resourceV2TransferParams, resourceV2UpperBoundParams, resourceV2ValueParams } from '../effectParams/resourceV2Params';
import { ResourceBoundMethods, ResourceMethods, Types } from '../../builderShared';
import * as builderExports from '../../builders';

describe('ResourceV2 effect helpers', () => {
	it('re-exports helpers through the config builders index', () => {
		expect(builderExports.resourceAddEffect).toBe(resourceAddEffect);
		expect(builderExports.resourceRemoveEffect).toBe(resourceRemoveEffect);
		expect(builderExports.resourceTransferEffect).toBe(resourceTransferEffect);
		expect(builderExports.resourceUpperBoundIncreaseEffect).toBe(resourceUpperBoundIncreaseEffect);
	});

	it('builds add/remove/transfer effects with amount and percent payloads', () => {
		const addEffect = resourceAddEffect((params) => params.resource('absorption').amount(5).suppressHooks());
		const removeEffect = resourceRemoveEffect((params) => params.resource('focus').percent(25).rounding(ResourceV2RoundingMode.Nearest));
		const transferEffect = resourceTransferEffect((params) => params.donor('absorption').recipient('focus').percent(50).rounding(ResourceV2RoundingMode.Down).suppressHooks());

		expect(addEffect).toEqual({
			type: Types.Resource,
			method: ResourceMethods.ADD,
			params: {
				resourceId: 'absorption',
				payload: { kind: 'amount', amount: 5 },
				reconciliation: ResourceV2ReconciliationStrategy.Clamp,
				suppressHooks: true,
			},
		});

		expect(removeEffect).toEqual({
			type: Types.Resource,
			method: ResourceMethods.REMOVE,
			params: {
				resourceId: 'focus',
				payload: {
					kind: 'percent',
					percent: 25,
					rounding: ResourceV2RoundingMode.Nearest,
				},
				reconciliation: ResourceV2ReconciliationStrategy.Clamp,
			},
		});

		expect(transferEffect).toEqual({
			type: Types.Resource,
			method: ResourceMethods.TRANSFER,
			params: {
				donor: {
					resourceId: 'absorption',
					reconciliation: ResourceV2ReconciliationStrategy.Clamp,
				},
				recipient: {
					resourceId: 'focus',
					reconciliation: ResourceV2ReconciliationStrategy.Clamp,
				},
				payload: {
					kind: 'percent',
					percent: 50,
					rounding: ResourceV2RoundingMode.Down,
				},
				suppressHooks: true,
			},
		});
	});

	it('supports passing fully built parameter objects', () => {
		const params = resourceV2ValueParams().resource('absorption').amount(3).build();

		expect(resourceAddEffect(params)).toEqual({
			type: Types.Resource,
			method: ResourceMethods.ADD,
			params: {
				resourceId: 'absorption',
				payload: { kind: 'amount', amount: 3 },
				reconciliation: ResourceV2ReconciliationStrategy.Clamp,
			},
		});
	});

	it('throws when percent payload omits rounding or rounding precedes percent', () => {
		expect(() => resourceAddEffect((params) => params.resource('absorption').percent(20))).toThrowError('rounding');

		expect(() => resourceAddEffect((params) => params.resource('absorption').rounding(ResourceV2RoundingMode.Up).amount(1))).toThrowError('percent(). Call percent() before rounding()');
	});

	it('rejects unsupported reconciliation strategies', () => {
		expect(() =>
			resourceRemoveEffect((params) =>
				params
					.resource('absorption')
					.amount(2)
					.reconciliation('reject' as unknown as ResourceV2ReconciliationStrategy),
			),
		).toThrowError('clamp reconciliation');

		expect(() =>
			resourceTransferEffect((params) =>
				params
					.donor('absorption', 'reject' as unknown as ResourceV2ReconciliationStrategy)
					.recipient('focus')
					.amount(2),
			),
		).toThrowError('clamp reconciliation');
	});

	it('requires donor and recipient when building transfer params', () => {
		expect(() => resourceV2TransferParams().amount(3).build()).toThrowError('donor');
		expect(() => resourceV2TransferParams().donor('absorption').amount(3).build()).toThrowError('recipient');
	});

	it('builds upper-bound increase effects and blocks decrease attempts', () => {
		const params = resourceV2UpperBoundParams().resource('absorption').amount(4);

		expect(resourceUpperBoundIncreaseEffect(params)).toEqual({
			type: Types.ResourceUpperBound,
			method: ResourceBoundMethods.INCREASE,
			params: {
				resourceId: 'absorption',
				amount: 4,
				reconciliation: ResourceV2ReconciliationStrategy.Clamp,
			},
		});

		expect(() => resourceUpperBoundIncreaseEffect((builder) => builder.resource('absorption').amount(1).decrease())).toThrowError('bound decreases');
	});
});
