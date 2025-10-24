import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { hydrateResourceV2Metadata } from '../src/resourcesV2/index.ts';
import { PlayerState, setResourceV2Keys } from '../src/state/index.ts';
import { ResourceV2Service } from '../src/services/resourceV2_service.ts';
import type { EngineContext } from '../src/context.ts';

const createStubContext = (): EngineContext =>
	({
		game: {
			players: [],
		},
	}) as unknown as EngineContext;

const bootstrapService = () => {
	const content = createContentFactory();
	const catalog = hydrateResourceV2Metadata(
		content.resourcesV2,
		content.resourceGroups,
	);
	setResourceV2Keys(catalog);
	const service = new ResourceV2Service(catalog);
	const context = createStubContext();
	const player = new PlayerState('A', 'Tester');
	const opponent = new PlayerState('B', 'Opponent');
	return { service, catalog, context, player, opponent };
};

const resetResourceV2Registry = () => {
	setResourceV2Keys();
};

const ensureResourceId = (ids: string[]): string => {
	const [first] = ids;
	if (!first) {
		throw new Error('Expected at least one ResourceV2 id to be registered.');
	}
	return first;
};

describe('ResourceV2Service', () => {
	beforeEach(resetResourceV2Registry);

	it('clamps value additions to the configured upper bound', () => {
		const { service, catalog, context, player } = bootstrapService();
		const boundedId = catalog.orderedResourceIds.find((id) => {
			const definition = catalog.resourcesById[id];
			return definition?.upperBound !== undefined;
		});
		const resourceId = ensureResourceId(
			boundedId ? [boundedId] : catalog.orderedResourceIds,
		);
		const definition = catalog.resourcesById[resourceId]!;
		const upperBound = definition.upperBound ?? 0;
		const delta = service.addValue(context, player, {
			resourceId,
			amount: upperBound * 3,
		});
		expect(delta).toBe(upperBound);
		expect(player.getResourceV2Value(resourceId)).toBe(upperBound);
	});

	it('transfers the applied amount between donor and recipient players', () => {
		const { service, catalog, context, player, opponent } = bootstrapService();
		const unparented = catalog.orderedResourceIds.filter(
			(id) => catalog.parentIdByResourceId[id] === undefined,
		);
		const resourceId = ensureResourceId(
			unparented.length ? unparented : catalog.orderedResourceIds,
		);
		service.addValue(context, player, { resourceId, amount: 10 });
		service.addValue(context, opponent, { resourceId, amount: 4 });

		const transferred = service.transferValue(context, player, opponent, {
			amount: 12,
			from: { resourceId },
			to: { resourceId },
		});

		expect(transferred).toBe(10);
		expect(player.getResourceV2Value(resourceId)).toBe(0);
		expect(opponent.getResourceV2Value(resourceId)).toBe(14);
	});

	it('emits gain and loss hooks unless suppressed', () => {
		const { service, catalog, context, player } = bootstrapService();
		const resourceId = ensureResourceId(catalog.orderedResourceIds);
		const gain = vi.fn();
		const loss = vi.fn();
		service.onGain(gain);
		service.onLoss(loss);

		const parentId = catalog.parentIdByResourceId[resourceId];
		const expectedCalls = parentId ? 2 : 1;

		service.addValue(context, player, { resourceId, amount: 5 });
		expect(gain).toHaveBeenCalledWith(context, {
			player,
			resourceId,
			amount: 5,
		});
		if (parentId) {
			expect(gain).toHaveBeenCalledWith(context, {
				player,
				resourceId: parentId,
				amount: 5,
			});
		}
		expect(gain).toHaveBeenCalledTimes(expectedCalls);

		service.removeValue(context, player, { resourceId, amount: 3 });
		expect(loss).toHaveBeenCalledWith(context, {
			player,
			resourceId,
			amount: 3,
		});
		if (parentId) {
			expect(loss).toHaveBeenCalledWith(context, {
				player,
				resourceId: parentId,
				amount: 3,
			});
		}
		expect(loss).toHaveBeenCalledTimes(expectedCalls);

		service.addValue(context, player, {
			resourceId,
			amount: 2,
			suppressHooks: true,
		});
		expect(gain).toHaveBeenCalledTimes(expectedCalls);
	});

	it('updates parent resource totals when children change', () => {
		const { service, catalog, context, player } = bootstrapService();
		const childId = catalog.orderedResourceIds.find(
			(id) => catalog.parentIdByResourceId[id] !== undefined,
		);
		const resourceId = ensureResourceId(
			childId ? [childId] : catalog.orderedResourceIds,
		);
		const parentId = catalog.parentIdByResourceId[resourceId];
		expect(parentId).toBeDefined();
		const expectedParentId = parentId as string;

		service.addValue(context, player, { resourceId, amount: 6 });
		service.addValue(context, player, { resourceId, amount: 4 });

		expect(service.getValue(player, expectedParentId)).toBe(10);
	});
});
