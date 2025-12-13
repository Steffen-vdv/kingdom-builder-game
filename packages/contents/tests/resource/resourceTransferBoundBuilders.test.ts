import { describe, expect, it } from 'vitest';

import { increaseUpperBound, resourceTransfer, transferEndpoint, type ResourceTransferEndpointPayload } from '../../src/resource';

describe('Resource transfer builders', () => {
	it('builds donor and recipient payloads with change helpers', () => {
		const donor = transferEndpoint('resource:gold')
			.player('active')
			.change((change) => change.amount(-3))
			.suppressRecentEntry()
			.build();
		const recipient = transferEndpoint('resource:happiness').player('opponent').change({ type: 'amount', amount: 5 }).skipTierUpdate().build();

		expect(donor).toEqual({
			player: 'active',
			resourceId: 'resource:gold',
			change: { type: 'amount', amount: -3 },
			options: { suppressRecentEntry: true },
		});
		expect(recipient).toEqual({
			player: 'opponent',
			resourceId: 'resource:happiness',
			change: { type: 'amount', amount: 5 },
			options: { skipTierUpdate: true },
		});

		const params = resourceTransfer().donor(donor).recipient(recipient).build();

		expect(params).toEqual({ donor, recipient });
		expect(params.donor).not.toBe(donor);
		expect(params.recipient).not.toBe(recipient);
	});

	it('rejects invalid reconciliation modes', () => {
		expect(() =>
			transferEndpoint('resource:gold')
				.reconciliation('invalid' as 'clamp')
				.change({
					type: 'amount',
					amount: -1,
				}),
		).toThrowError('reconciliation mode "invalid" is invalid');
	});

	it('accepts all valid reconciliation modes', () => {
		const validModes: Array<'clamp' | 'pass' | 'reject'> = ['clamp', 'pass', 'reject'];
		for (const mode of validModes) {
			const endpoint = transferEndpoint('resource:gold').reconciliation(mode).changeAmount(-1).build();
			expect(endpoint.reconciliationMode).toBe(mode);
		}
	});

	it('requires donor and recipient payloads before build', () => {
		const donor: ResourceTransferEndpointPayload = transferEndpoint('resource:gold').change({ type: 'amount', amount: -1 }).build();

		expect(() => resourceTransfer().build()).toThrowError('Resource transfer builder requires donor() before build().');
		expect(() => resourceTransfer().donor(donor).build()).toThrowError('Resource transfer builder requires recipient() before build().');
	});
});

describe('transferEndpoint convenience methods', () => {
	describe('changeAmount', () => {
		it('sets amount change type with provided value', () => {
			const endpoint = transferEndpoint('resource:gold').changeAmount(-10).build();

			expect(endpoint.change).toEqual({
				type: 'amount',
				amount: -10,
			});
		});

		it('rejects non-finite values', () => {
			expect(() => transferEndpoint('resource:gold').changeAmount(NaN)).toThrow('expected amount to be a finite number');
			expect(() => transferEndpoint('resource:gold').changeAmount(Infinity)).toThrow('expected amount to be a finite number');
		});
	});

	describe('changePercent', () => {
		it('converts whole percentage to decimal (e.g., 25 → 0.25)', () => {
			const endpoint = transferEndpoint('resource:gold').changePercent(25).build();

			expect(endpoint.change).toEqual({
				type: 'percent',
				modifiers: [0.25],
			});
		});

		it('converts negative percentages correctly', () => {
			const endpoint = transferEndpoint('resource:gold').changePercent(-50).build();

			expect(endpoint.change).toEqual({
				type: 'percent',
				modifiers: [-0.5],
			});
		});

		it('handles 100% as 1.0', () => {
			const endpoint = transferEndpoint('resource:gold').changePercent(100).build();

			expect(endpoint.change).toEqual({
				type: 'percent',
				modifiers: [1.0],
			});
		});

		it('handles small percentages correctly', () => {
			const endpoint = transferEndpoint('resource:gold').changePercent(1).build();

			expect(endpoint.change).toEqual({
				type: 'percent',
				modifiers: [0.01],
			});
		});

		it('rejects non-finite values', () => {
			expect(() => transferEndpoint('resource:gold').changePercent(NaN)).toThrow('expected percent to be a finite number');
			expect(() => transferEndpoint('resource:gold').changePercent(Infinity)).toThrow('expected percent to be a finite number');
		});
	});

	describe('reconciliation modes', () => {
		it('sets clamp mode via convenience method', () => {
			const endpoint = transferEndpoint('resource:gold').changeAmount(-5).clamp().build();

			expect(endpoint.reconciliationMode).toBe('clamp');
		});

		it('sets pass mode via convenience method', () => {
			const endpoint = transferEndpoint('resource:gold').changeAmount(-5).pass().build();

			expect(endpoint.reconciliationMode).toBe('pass');
		});
	});
});

describe('Resource upper-bound builder', () => {
	it('requires positive integer deltas', () => {
		expect(() => increaseUpperBound('resource:gold').delta(0)).toThrowError('Resource upper-bound builder expected delta() to be greater than 0 but received 0.');
		expect(() => increaseUpperBound('resource:gold').delta(1.5)).toThrowError('Resource upper-bound builder expected delta() to receive an integer but received 1.5.');
		expect(() => increaseUpperBound('resource:gold').delta(Number.NaN)).toThrowError('Resource upper-bound builder expected delta() to receive a finite number but received NaN.');
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
