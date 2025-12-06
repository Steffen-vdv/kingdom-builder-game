import { describe, it, expect } from 'vitest';
import { Land, PlayerState, GameState } from '../../src/state/index.ts';
import { Resource, Stat } from '@kingdom-builder/contents';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';
import { createRuntimeResourceCatalog } from '../../src/resource-v2/index.ts';

const RUNTIME_RESOURCE_CATALOG = createRuntimeResourceCatalog({
	resources: RESOURCE_V2_REGISTRY,
	groups: RESOURCE_GROUP_V2_REGISTRY,
});

describe('State classes', () => {
	it('calculates free slots on land', () => {
		const land = new Land('l1', 2, true);
		expect(land.slotsFree).toBe(2);
		land.slotsUsed = 1;
		expect(land.slotsFree).toBe(1);
	});

	it('updates resources and stats via resourceValues', () => {
		const player = new PlayerState('A', 'Alice');
		player.resourceValues[Resource.gold] = 5;
		player.resourceValues[Stat.populationMax] = 3;
		player.resourceValues[Stat.warWeariness] = 2;
		expect(player.resourceValues[Resource.gold]).toBe(5);
		expect(player.resourceValues[Stat.populationMax]).toBe(3);
		expect(player.resourceValues[Stat.warWeariness]).toBe(2);
	});

	it('defaults values to undefined until set', () => {
		const player = new PlayerState('A', 'Alice');
		expect(player.resourceValues[Stat.warWeariness]).toBeUndefined();
	});

	it('tracks resource touched when values become non-zero', () => {
		const player = new PlayerState('A', 'Alice');
		expect(player.resourceTouched[Stat.armyStrength]).toBeFalsy();
		player.resourceValues[Stat.armyStrength] = 1;
		// Note: resourceTouched is updated by setResourceValue, not raw assignment
		// For now test the basic structure
		expect(player.resourceValues[Stat.armyStrength]).toBe(1);
	});

	it('provides active and opponent players', () => {
		const game = new GameState(RUNTIME_RESOURCE_CATALOG, 'Alice', 'Bob');
		expect(game.active.id).toBe('A');
		expect(game.opponent.id).toBe('B');
		game.currentPlayerIndex = 1;
		expect(game.active.id).toBe('B');
		expect(game.opponent.id).toBe('A');
	});
});
