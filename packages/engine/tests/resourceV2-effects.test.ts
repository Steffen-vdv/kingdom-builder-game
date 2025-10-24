import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';
import {
	hydrateResourceV2Metadata,
	type ResourceV2RuntimeCatalog,
} from '../src/resourcesV2/index.ts';
import {
	PlayerState,
	setResourceV2Keys,
	type PlayerState as PlayerStateType,
} from '../src/state/index.ts';
import type { EngineContext } from '../src/context.ts';
import { ResourceV2Service } from '../src/services/resourceV2_service.ts';
import { resourceV2Add } from '../src/effects/resource_v2_add.ts';
import { resourceV2Remove } from '../src/effects/resource_v2_remove.ts';
import { resourceV2Transfer } from '../src/effects/resource_v2_transfer.ts';
import { resourceV2UpperBoundIncrease } from '../src/effects/resource_v2_upper_bound_increase.ts';

interface TestHarness {
	catalog: ResourceV2RuntimeCatalog;
	service: ResourceV2Service;
	context: EngineContext;
	player: PlayerStateType;
	opponent: PlayerStateType;
}

const resetResourceV2Registry = () => {
	setResourceV2Keys();
};

const createHarness = (): TestHarness => {
	const content = createContentFactory();
	const catalog = hydrateResourceV2Metadata(
		content.resourcesV2,
		content.resourceGroups,
	);
	setResourceV2Keys(catalog);
	const service = new ResourceV2Service(catalog);
	const player = new PlayerState('A', 'Tester');
	const opponent = new PlayerState('B', 'Opponent');
	const context = {
		services: { resourceV2: service },
		activePlayer: player,
		opponent,
		recentResourceGains: [],
		recordRecentResourceGain: () => {},
	} as unknown as EngineContext;
	return { catalog, service, context, player, opponent };
};

const ensureResourceId = (
	catalog: ResourceV2RuntimeCatalog,
	filter?: (id: string) => boolean,
): string => {
	const ids = catalog.orderedResourceIds.filter(filter ?? (() => true));
	const [first] = ids.length ? ids : catalog.orderedResourceIds;
	if (!first) {
		throw new Error('Expected at least one ResourceV2 id to be registered.');
	}
	return first;
};

describe('ResourceV2 effect handlers', () => {
	beforeEach(resetResourceV2Registry);
	afterEach(resetResourceV2Registry);

	it('applies percent rounding when adding value', () => {
		const { catalog, service, context, player } = createHarness();
		const resourceId = ensureResourceId(
			catalog,
			(id) => catalog.parentIdByResourceId[id] === undefined,
		);
		const base = 15;
		player.setResourceV2Value(resourceId, base);
		const gain = vi.fn();
		service.onGain(gain);
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'add',
			params: {
				resourceId,
				percent: 33,
				rounding: 'down',
			},
		};

		resourceV2Add(effect, context, 1);

		expect(player.getResourceV2Value(resourceId)).toBe(base + 4);
		expect(gain).toHaveBeenCalledWith(context, {
			player,
			resourceId,
			amount: 4,
		});
	});

	it('suppresses hooks when requested by removal metadata', () => {
		const { catalog, service, context, player } = createHarness();
		const resourceId = ensureResourceId(
			catalog,
			(id) => catalog.parentIdByResourceId[id] === undefined,
		);
		player.setResourceV2Value(resourceId, 9);
		const loss = vi.fn();
		service.onLoss(loss);
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'remove',
			params: {
				resourceId,
				amount: 5,
				suppressHooks: true,
			},
		};

		resourceV2Remove(effect, context, 1);

		expect(player.getResourceV2Value(resourceId)).toBe(4);
		expect(loss).not.toHaveBeenCalled();
	});

	it('throws when params are missing for add effects', () => {
		const { context } = createHarness();
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'add',
		};
		expect(() => resourceV2Add(effect, context, 1)).toThrowError(
			'resource_v2:add effect requires params.',
		);
	});

	it('removes value from the opponent when targeted explicitly', () => {
		const { catalog, service, context, opponent } = createHarness();
		const resourceId = ensureResourceId(
			catalog,
			(id) => catalog.parentIdByResourceId[id] === undefined,
		);
		opponent.setResourceV2Value(resourceId, 7);
		const loss = vi.fn();
		service.onLoss(loss);
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'remove',
			params: {
				resourceId,
				amount: 4,
				target: 'opponent',
			},
		};

		resourceV2Remove(effect, context, 1);

		expect(opponent.getResourceV2Value(resourceId)).toBe(3);
		expect(loss).toHaveBeenCalledWith(context, {
			player: opponent,
			resourceId,
			amount: 4,
		});
	});

	it('throws when params are missing for remove effects', () => {
		const { context } = createHarness();
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'remove',
		};
		expect(() => resourceV2Remove(effect, context, 1)).toThrowError(
			'resource_v2:remove effect requires params.',
		);
	});

	it('returns overflow to the donor when transfers exceed the recipient bound', () => {
		const { catalog, context, player, opponent } = createHarness();
		const resourceId = ensureResourceId(
			catalog,
			(id) => catalog.parentIdByResourceId[id] === undefined,
		);
		player.setResourceV2Value(resourceId, 20);
		opponent.setResourceV2Value(resourceId, 8);
		opponent.setResourceV2UpperBound(resourceId, 10);
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'transfer',
			params: {
				amount: 12,
				from: { resourceId, reconciliation: 'clamp' },
				to: { resourceId, reconciliation: 'clamp' },
				donor: 'active',
				recipient: 'opponent',
			},
		};

		resourceV2Transfer(effect, context, 1);

		expect(player.getResourceV2Value(resourceId)).toBe(18);
		expect(opponent.getResourceV2Value(resourceId)).toBe(10);
	});

	it('defaults transfer donor and recipient when not specified', () => {
		const { catalog, context, player, opponent } = createHarness();
		const resourceId = ensureResourceId(
			catalog,
			(id) => catalog.parentIdByResourceId[id] === undefined,
		);
		opponent.setResourceV2Value(resourceId, 6);
		player.setResourceV2Value(resourceId, 2);
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'transfer',
			params: {
				amount: 5,
				from: { resourceId },
				to: { resourceId },
			},
		};

		resourceV2Transfer(effect, context, 1);

		expect(opponent.getResourceV2Value(resourceId)).toBe(1);
		expect(player.getResourceV2Value(resourceId)).toBe(7);
	});

	it('throws when params are missing for transfers', () => {
		const { context } = createHarness();
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'transfer',
		};
		expect(() => resourceV2Transfer(effect, context, 1)).toThrowError(
			'resource_v2:transfer effect requires params.',
		);
	});

	it('multiplies upper bound increases across evaluator multipliers', () => {
		const { catalog, context, player } = createHarness();
		const resourceId = ensureResourceId(
			catalog,
			(id) => catalog.parentIdByResourceId[id] === undefined,
		);
		player.setResourceV2UpperBound(resourceId, 5);
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'upper_bound_increase',
			params: {
				resourceId,
				amount: 2,
				player: 'active',
			},
		};

		resourceV2UpperBoundIncrease(effect, context, 2);

		expect(player.getResourceV2UpperBound(resourceId)).toBe(9);
	});

	it('applies upper bound changes to the active player by default', () => {
		const { catalog, context, player } = createHarness();
		const resourceId = ensureResourceId(
			catalog,
			(id) => catalog.parentIdByResourceId[id] === undefined,
		);
		player.setResourceV2UpperBound(resourceId, 3);
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'upper_bound_increase',
			params: {
				resourceId,
				amount: 1,
			},
		};

		resourceV2UpperBoundIncrease(effect, context, 1);

		expect(player.getResourceV2UpperBound(resourceId)).toBe(4);
	});

	it('throws when params are missing for upper bound increases', () => {
		const { context } = createHarness();
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'upper_bound_increase',
		};
		expect(() => resourceV2UpperBoundIncrease(effect, context, 1)).toThrowError(
			'resource_v2:upper_bound_increase effect requires params.',
		);
	});
});
