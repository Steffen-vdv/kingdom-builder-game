import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResourceV2Service } from '../src/services/resourceV2_service';
import { hydrateResourceV2Metadata } from '../src/resourcesV2';
import {
	PlayerState,
	setResourceV2Keys,
	setResourceKeys,
	setStatKeys,
	setPhaseKeys,
	setPopulationRoleKeys,
} from '../src/state';
import { createResourceV2Factory } from '@kingdom-builder/testing/factories/resourceV2';
import type { EngineContext } from '../src/context';

const createTestContext = (): EngineContext => ({}) as EngineContext;

describe('ResourceV2Service', () => {
	beforeEach(() => {
		setResourceKeys([]);
		setStatKeys([]);
		setPopulationRoleKeys([]);
		setPhaseKeys([]);
	});

	afterEach(() => {
		setResourceV2Keys(undefined);
	});

	it('clamps values against resource bounds', () => {
		const factory = createResourceV2Factory((prefix) => `${prefix}:id`);
		const resource = factory.createResource({
			id: 'resource:test',
			name: 'Test Resource',
			order: 0,
			lowerBound: 0,
			upperBound: 10,
		});
		const catalog = hydrateResourceV2Metadata(
			factory.resources,
			factory.groups,
		);
		setResourceV2Keys(catalog);
		const player = new PlayerState('A', 'Tester');
		const onChange = vi.fn();
		const service = new ResourceV2Service(onChange);
		const context = createTestContext();

		const change = service.applyDelta(context, player, {
			resourceId: resource.id,
			amount: 15,
		});

		expect(change).toBe(10);
		expect(player.getResourceV2Value(resource.id)).toBe(10);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('transfers resources between donor and recipient using actual removed amount', () => {
		const factory = createResourceV2Factory((prefix) => `${prefix}:id`);
		const donor = factory.createResource({
			id: 'resource:donor',
			name: 'Donor',
			order: 0,
			lowerBound: 0,
		});
		const recipient = factory.createResource({
			id: 'resource:recipient',
			name: 'Recipient',
			order: 1,
			lowerBound: 0,
		});
		const catalog = hydrateResourceV2Metadata(
			factory.resources,
			factory.groups,
		);
		setResourceV2Keys(catalog);
		const player = new PlayerState('A', 'Tester');
		player.setResourceV2Value(donor.id, 40);
		player.setResourceV2Value(recipient.id, 5);
		player.resetRecentResourceV2Gains();
		const onChange = vi.fn();
		const service = new ResourceV2Service(onChange);
		const context = createTestContext();

		const outcome = service.applyTransfer(context, player, {
			percent: 50,
			from: { resourceId: donor.id },
			to: { resourceId: recipient.id },
		});

		expect(outcome.amountMoved).toBe(20);
		expect(player.getResourceV2Value(donor.id)).toBe(20);
		expect(player.getResourceV2Value(recipient.id)).toBe(25);
		expect(onChange).toHaveBeenCalledWith(
			context,
			player,
			recipient.id,
			expect.anything(),
		);
		expect(onChange).toHaveBeenCalledWith(
			context,
			player,
			donor.id,
			expect.anything(),
		);
	});

	it('respects hook suppression flags when applying deltas', () => {
		const factory = createResourceV2Factory((prefix) => `${prefix}:id`);
		const resource = factory.createResource({
			id: 'resource:hooks',
			name: 'Hooks',
			order: 0,
		});
		const catalog = hydrateResourceV2Metadata(
			factory.resources,
			factory.groups,
		);
		setResourceV2Keys(catalog);
		const player = new PlayerState('A', 'Tester');
		const onChange = vi.fn();
		const service = new ResourceV2Service(onChange);
		const context = createTestContext();

		service.applyDelta(context, player, { resourceId: resource.id, amount: 3 });
		service.applyDelta(context, player, {
			resourceId: resource.id,
			amount: 2,
			suppressHooks: true,
		});

		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('updates parent resources when children change', () => {
		const factory = createResourceV2Factory((prefix) => `${prefix}:id`);
		const parent = factory.createParent({
			id: 'resource:parent',
			name: 'Parent',
			order: 0,
		});
		const childA = factory.createResource({
			id: 'resource:child:A',
			name: 'Child A',
			order: 0,
		});
		const childB = factory.createResource({
			id: 'resource:child:B',
			name: 'Child B',
			order: 1,
		});
		factory.createGroup({
			id: 'group:test',
			name: 'Group',
			order: 0,
			parent,
			children: [childA.id, childB.id],
		});
		const catalog = hydrateResourceV2Metadata(
			factory.resources,
			factory.groups,
		);
		setResourceV2Keys(catalog);
		const player = new PlayerState('A', 'Tester');
		player.setResourceV2Value(parent.id, 0);
		const onChange = vi.fn();
		const service = new ResourceV2Service(onChange);
		const context = createTestContext();

		service.applyDelta(context, player, { resourceId: childA.id, amount: 3 });
		service.applyDelta(context, player, { resourceId: childB.id, amount: 4 });

		expect(player.getResourceV2Value(parent.id)).toBe(7);
		expect(onChange).toHaveBeenCalledWith(
			context,
			player,
			parent.id,
			expect.anything(),
		);
		expect(
			player.resourceV2.recentGains
				.filter((gain) => gain.key === parent.id)
				.at(-1)?.amount,
		).toBe(4);
	});
});
