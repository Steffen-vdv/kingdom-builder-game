import { describe, it, expect } from 'vitest';
import {
	Land,
	PlayerState,
	GameState,
	setResourceKeys,
	setStatKeys,
	initializePlayerResourceV2State,
	resetRecentResourceV2Gains,
} from '../../src/state/index.ts';
import { loadResourceV2Registry } from '../../src/resourceV2/registry.ts';
import {
	Resource,
	Stat,
	resourceV2Definition,
	resourceV2Group,
	resourceV2GroupParent,
	resourceV2TierTrack,
} from '@kingdom-builder/contents';

setResourceKeys(Object.values(Resource));
setStatKeys(Object.values(Stat));

describe('State classes', () => {
	it('calculates free slots on land', () => {
		const land = new Land('l1', 2, true);
		expect(land.slotsFree).toBe(2);
		land.slotsUsed = 1;
		expect(land.slotsFree).toBe(1);
	});

	it('updates resources and stats via getters and setters', () => {
		const player = new PlayerState('A', 'Alice');
		player.gold = 5;
		player.maxPopulation = 3;
		player.warWeariness = 2;
		expect(player.gold).toBe(5);
		expect(player.maxPopulation).toBe(3);
		expect(player.warWeariness).toBe(2);
	});

	it('defaults war weariness to 0', () => {
		const player = new PlayerState('A', 'Alice');
		expect(player.warWeariness).toBe(0);
	});

	it('tracks stat history when values become non-zero', () => {
		const player = new PlayerState('A', 'Alice');
		expect(player.statsHistory[Stat.armyStrength]).toBe(false);
		player.armyStrength = 1;
		expect(player.statsHistory[Stat.armyStrength]).toBe(true);
		player.armyStrength = 0;
		expect(player.statsHistory[Stat.armyStrength]).toBe(true);
	});

	it('provides active and opponent players', () => {
		const game = new GameState('Alice', 'Bob');
		expect(game.active.id).toBe('A');
		expect(game.opponent.id).toBe('B');
		game.currentPlayerIndex = 1;
		expect(game.active.id).toBe('B');
		expect(game.opponent.id).toBe('A');
	});

	it('initializes ResourceV2 state with registry metadata', () => {
		const resourceA = resourceV2Definition('resource:a')
			.name('Resource A')
			.order(1)
			.lowerBound(0)
			.group('group:alpha', 1)
			.tierTrack(
				resourceV2TierTrack('track:a')
					.tierWith('tier:a-1', (tier) => tier.range(0, 5))
					.tierWith('tier:a-2', (tier) => tier.range(5, 10)),
			)
			.build();
		const resourceB = resourceV2Definition('resource:b')
			.name('Resource B')
			.order(2)
			.lowerBound(0)
			.group('group:alpha', 2)
			.build();
		const looseResource = resourceV2Definition('resource:c')
			.name('Resource C')
			.order(3)
			.lowerBound(0)
			.build();
		const parentTrack = resourceV2TierTrack('track:parent')
			.tierWith('tier:parent-1', (tier) => tier.range(0, 10))
			.tierWith('tier:parent-2', (tier) => tier.range(10, 20))
			.tierWith('tier:parent-3', (tier) => tier.range(20))
			.build();
		const group = resourceV2Group('group:alpha')
			.order(1)
			.parent(
				resourceV2GroupParent('parent:alpha')
					.name('Alpha')
					.order(1)
					.lowerBound(0)
					.upperBound(50)
					.tierTrack(parentTrack),
			)
			.children([resourceA.id, resourceB.id])
			.build();
		const registry = loadResourceV2Registry({
			resources: [resourceA, resourceB, looseResource],
			groups: [group],
		});

		const player = new PlayerState('A', 'Alice');
		const state = initializePlayerResourceV2State(player, registry);

		expect(state).toBe(player.resourceV2);
		expect(state.resourceIds).toEqual([
			resourceA.id,
			resourceB.id,
			looseResource.id,
		]);
		expect(Object.isFrozen(state.resourceIds)).toBe(true);
		expect(state.parentIds).toEqual(['parent:alpha']);
		expect(Object.isFrozen(state.parentIds)).toBe(true);

		state.amounts[resourceA.id] = 3;
		state.amounts[resourceB.id] = 7;
		expect(state.amounts[resourceA.id]).toBe(3);
		expect(state.amounts[resourceB.id]).toBe(7);
		expect(state.amounts['parent:alpha']).toBe(10);
		expect(() => {
			state.amounts['parent:alpha'] = 15;
		}).toThrow(
			'ResourceV2 parent "parent:alpha" amount is derived from child resources.',
		);

		expect(state.touched['parent:alpha']).toBe(false);
		state.touched[resourceA.id] = true;
		expect(state.touched['parent:alpha']).toBe(true);
		expect(() => {
			state.touched['parent:alpha'] = true;
		}).toThrow(
			'ResourceV2 parent "parent:alpha" touched state is derived from child resources.',
		);

		expect(state.bounds[resourceA.id]).toEqual({ lowerBound: 0 });
		expect(state.bounds['parent:alpha']).toEqual({
			lowerBound: 0,
			upperBound: 50,
		});
		expect(state.boundHistory[resourceA.id]).toBe(false);
		expect(state.boundHistory['parent:alpha']).toBe(false);
		expect(state.childToParent[resourceA.id]).toBe('parent:alpha');
		expect(state.childToParent[resourceB.id]).toBe('parent:alpha');
		expect(state.childToParent[looseResource.id]).toBeUndefined();
		expect(state.parentChildren['parent:alpha']).toEqual([
			resourceA.id,
			resourceB.id,
		]);
		expect(Object.isFrozen(state.parentChildren['parent:alpha']!)).toBe(true);

		expect(state.tiers[resourceA.id]).toEqual({
			trackId: 'track:a',
			tierId: 'tier:a-1',
			nextTierId: 'tier:a-2',
			previousTierId: undefined,
		});
		expect(state.tiers['parent:alpha']).toEqual({
			trackId: 'track:parent',
			tierId: 'tier:parent-1',
			nextTierId: 'tier:parent-2',
			previousTierId: undefined,
		});

		state.recentDeltas[resourceA.id] = 5;
		state.recentDeltas[resourceB.id] = -2;
		const recent = resetRecentResourceV2Gains(state);
		expect(recent).toEqual([
			{ resourceId: resourceA.id, delta: 5 },
			{ resourceId: resourceB.id, delta: -2 },
		]);
		expect(state.recentDeltas[resourceA.id]).toBe(0);
		expect(state.recentDeltas[resourceB.id]).toBe(0);
	});
});
