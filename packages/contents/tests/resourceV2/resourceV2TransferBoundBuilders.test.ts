import { describe, expect, it, vi } from 'vitest';
import type { ResourceV2TransferEndpointPayload } from '../../src/resourceV2';

const contentsModulePromise = import('../../src/resourceV2/index.ts');

vi.mock('@kingdom-builder/contents', () =>
	contentsModulePromise.then((module) => ({
		resourceV2: module.resourceV2,
		resourceGroup: module.resourceGroup,
		createResourceV2Registry: module.createResourceV2Registry,
		createResourceGroupRegistry: module.createResourceGroupRegistry,
	})),
);

await import('../../src/resourceV2/catalog');
const { increaseUpperBound, resourceTransfer, transferEndpoint } = await import('../../src/resourceV2');

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

	it('captures reconciliation mode when change builders request it', () => {
		const donor = transferEndpoint('resource:gold')
			.change((change) => change.amount(-4).reconciliation())
			.build();

		expect(donor.reconciliationMode).toBe('clamp');
	});

	it('rejects change builders that attempt to suppress hooks', () => {
		expect(() => transferEndpoint('resource:gold').change((change) => change.amount(-2).suppressHooks())).toThrowError(
			'ResourceV2 transfer endpoint builder does not support suppressHooks(). Remove the suppressHooks() call when configuring donor/recipient changes.',
		);
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

	it('validates boolean flags on transfer options when cloning payloads', () => {
		const donor = transferEndpoint('resource:gold').change({ type: 'amount', amount: -1 }).build();
		const malformedOptions: ResourceV2TransferEndpointPayload = {
			...donor,
			options: {
				suppressTouched: 'true' as unknown as boolean,
			},
		};

		expect(() => resourceTransfer().donor(malformedOptions)).toThrowError('ResourceV2 transfer builder expected options.suppressTouched to be boolean when provided.');
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
