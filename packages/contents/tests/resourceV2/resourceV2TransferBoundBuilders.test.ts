import { describe, expect, it } from 'vitest';

import { increaseUpperBound, resourceTransfer, transferEndpoint, type ResourceV2TransferEndpointPayload } from '../src/resourceV2';

describe('ResourceV2 transfer builders', () => {
	it('builds donor and recipient payloads with change helpers', () => {
		const donor = transferEndpoint('resource:gold')
			.player('active')
			.change((change) => change.amount(-3))
			.suppressTouched()
			.build();
		const recipient = transferEndpoint('resource:happiness').player('opponent').change({ type: 'amount', amount: 5 }).suppressRecentEntry().skipTierUpdate().build();

		expect(donor).toEqual({
			player: 'active',
			resourceId: 'resource:gold',
			change: { type: 'amount', amount: -3 },
			options: { suppressTouched: true },
		});
		expect(recipient).toEqual({
			player: 'opponent',
			resourceId: 'resource:happiness',
			change: { type: 'amount', amount: 5 },
			options: { suppressRecentEntry: true, skipTierUpdate: true },
		});

		const params = resourceTransfer().donor(donor).recipient(recipient).build();

		expect(params).toEqual({ donor, recipient });
		expect(params.donor).not.toBe(donor);
		expect(params.recipient).not.toBe(recipient);
	});

	it('rejects unsupported reconciliation modes', () => {
		expect(() =>
			transferEndpoint('resource:gold').reconciliation('reject').change({
				type: 'amount',
				amount: -1,
			}),
		).toThrowError('ResourceV2 transfer endpoint builder reconciliation mode "reject" is not supported yet. Supported modes: clamp.');
	});

	it('requires donor and recipient payloads before build', () => {
		const donor: ResourceV2TransferEndpointPayload = transferEndpoint('resource:gold').change({ type: 'amount', amount: -1 }).build();

		expect(() => resourceTransfer().build()).toThrowError('ResourceV2 transfer builder requires donor() before build().');
		expect(() => resourceTransfer().donor(donor).build()).toThrowError('ResourceV2 transfer builder requires recipient() before build().');
	});
});

describe('ResourceV2 upper-bound builder', () => {
	it('requires positive integer deltas', () => {
		expect(() => increaseUpperBound('resource:gold').delta(0)).toThrowError('ResourceV2 upper-bound builder expected delta() to be greater than 0 but received 0.');
		expect(() => increaseUpperBound('resource:gold').delta(1.5)).toThrowError('ResourceV2 upper-bound builder expected delta() to receive an integer but received 1.5.');
		expect(() => increaseUpperBound('resource:gold').delta(Number.NaN)).toThrowError('ResourceV2 upper-bound builder expected delta() to receive a finite number but received NaN.');
	});

	it('builds payloads when configured correctly', () => {
		const params = increaseUpperBound('resource:gold').player('opponent').delta(3).build();

		expect(params).toEqual({
			player: 'opponent',
			resourceId: 'resource:gold',
			delta: 3,
		});
	});
});
