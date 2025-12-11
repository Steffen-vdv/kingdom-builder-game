import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	RULES,
	PopulationRole,
	Stat,
	Resource,
	getResourceId,
} from '@kingdom-builder/contents';
import { DevelopmentId } from '@kingdom-builder/contents/developments';
import {
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
} from '@kingdom-builder/contents/registries/resource';

describe('dev mode start configuration', () => {
	it('applies content-driven overrides when dev mode is enabled', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			rules: RULES,
			resourceCatalog: {
				resources: RESOURCE_REGISTRY,
				groups: RESOURCE_GROUP_REGISTRY,
			},
			devMode: true,
		});
		const snapshot = session.getSnapshot();
		const [player, opponent] = snapshot.game.players;
		if (!player || !opponent) {
			throw new Error('Expected both players to be present at game start');
		}
		const goldId = getResourceId(Resource.gold);
		const happinessId = getResourceId(Resource.happiness);
		const apId = getResourceId(Resource.ap);
		const castleId = getResourceId(Resource.castleHP);
		const councilId = getResourceId(PopulationRole.Council);
		const legionId = getResourceId(PopulationRole.Legion);
		const fortifierId = getResourceId(PopulationRole.Fortifier);
		expect(snapshot.game.devMode).toBe(true);
		expect(player.values[goldId]).toBe(100);
		expect(player.values[happinessId]).toBe(10);
		expect(player.values[councilId]).toBe(2);
		expect(player.values[legionId]).toBe(1);
		expect(player.values[fortifierId]).toBe(1);
		expect(opponent.values[castleId]).toBe(10);
		// AP starts at 0; it is granted during the Growth phase by Council members
		expect(player.values[apId]).toBe(0);
		expect(player.resourceBounds[goldId]?.lowerBound).toBe(0);
		expect(snapshot.game.resourceCatalog.resources.byId[goldId]).toBeDefined();
	});

	it('applies onBuild effects for start config developments', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			rules: RULES,
			resourceCatalog: {
				resources: RESOURCE_REGISTRY,
				groups: RESOURCE_GROUP_REGISTRY,
			},
			devMode: true,
		});
		const snapshot = session.getSnapshot();
		const [player] = snapshot.game.players;
		if (!player) {
			throw new Error('Expected player to be present at game start');
		}
		// Count houses in devmode: 6 houses from initial_setup_devmode action
		const houseCount = player.lands.reduce((count, land) => {
			return (
				count +
				land.developments.filter((dev) => dev === DevelopmentId.House).length
			);
		}, 0);
		expect(houseCount).toBe(6);
		// Each house adds +1 to max population via onBuild effect
		// Base populationMax is 1 (from initial_setup_devmode action)
		// So total should be 1 + 6 = 7
		const populationMaxId = Stat.populationMax;
		expect(player.values[populationMaxId]).toBe(7);
	});
});
