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
	getResourceV2Id,
} from '@kingdom-builder/contents';
import { DevelopmentId } from '@kingdom-builder/contents/developments';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';

describe('dev mode start configuration', () => {
	it('applies content-driven overrides when dev mode is enabled', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			rules: RULES,
			resourceCatalogV2: {
				resources: RESOURCE_V2_REGISTRY,
				groups: RESOURCE_GROUP_V2_REGISTRY,
			},
			devMode: true,
		});
		const snapshot = session.getSnapshot();
		const [player, opponent] = snapshot.game.players;
		if (!player || !opponent) {
			throw new Error('Expected both players to be present at game start');
		}
		const goldId = getResourceV2Id(Resource.gold);
		const happinessId = getResourceV2Id(Resource.happiness);
		const apId = getResourceV2Id(Resource.ap);
		const castleId = getResourceV2Id(Resource.castleHP);
		expect(snapshot.game.devMode).toBe(true);
		expect(player.resources[Resource.gold]).toBe(100);
		expect(player.resources[Resource.happiness]).toBe(10);
		expect(player.population[PopulationRole.Council]).toBe(2);
		expect(player.population[PopulationRole.Legion]).toBe(1);
		expect(player.population[PopulationRole.Fortifier]).toBe(1);
		expect(opponent.resources[Resource.castleHP]).toBe(1);
		expect(player.valuesV2[goldId]).toBe(100);
		expect(player.valuesV2[happinessId]).toBe(10);
		// AP starts at 0; it is granted during the Growth phase by Council members
		expect(player.valuesV2[apId]).toBe(0);
		expect(player.resourceBoundsV2[goldId]?.lowerBound).toBe(0);
		expect(opponent.valuesV2[castleId]).toBe(1);
		expect(
			snapshot.game.resourceCatalogV2.resources.byId[goldId],
		).toBeDefined();
	});

	it('applies onBuild effects for start config developments', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			rules: RULES,
			resourceCatalogV2: {
				resources: RESOURCE_V2_REGISTRY,
				groups: RESOURCE_GROUP_V2_REGISTRY,
			},
			devMode: true,
		});
		const snapshot = session.getSnapshot();
		const [player] = snapshot.game.players;
		if (!player) {
			throw new Error('Expected player to be present at game start');
		}
		// Count houses in devmode: 6 houses configured in GAME_START devMode
		const houseCount = player.lands.reduce((count, land) => {
			return (
				count +
				land.developments.filter((dev) => dev === DevelopmentId.House).length
			);
		}, 0);
		expect(houseCount).toBe(6);
		// Each house adds +1 to max population via onBuild effect
		// Base populationMax is 1 (from PLAYER_START_STATS in game.ts)
		// So total should be 1 + 6 = 7
		const populationMaxId = Stat.populationMax;
		expect(player.valuesV2[populationMaxId]).toBe(7);
	});
});
