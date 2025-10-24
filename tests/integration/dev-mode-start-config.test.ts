import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	Resource,
	PopulationRole,
} from '@kingdom-builder/contents';
import { getResourceV2Id } from '@kingdom-builder/contents/resources';
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
			start: GAME_START,
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
		expect(snapshot.game.devMode).toBe(true);
		const goldResourceId = getResourceV2Id(Resource.gold);
		const happinessResourceId = getResourceV2Id(Resource.happiness);
		expect(player.valuesV2?.[goldResourceId]).toBe(100);
		expect(player.valuesV2?.[happinessResourceId]).toBe(10);
		expect(player.population[PopulationRole.Council]).toBe(2);
		expect(player.population[PopulationRole.Legion]).toBe(1);
		expect(player.population[PopulationRole.Fortifier]).toBe(1);
		const castleResourceId = getResourceV2Id(Resource.castleHP);
		expect(opponent.valuesV2?.[castleResourceId]).toBe(1);
	});
});
