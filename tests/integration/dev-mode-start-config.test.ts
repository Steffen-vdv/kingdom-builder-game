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
import { createIntegrationMetadataSources } from './fixtures';

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
			devMode: true,
			metadataSources: createIntegrationMetadataSources(),
		});
		const snapshot = session.getSnapshot();
		const [player, opponent] = snapshot.game.players;
		if (!player || !opponent) {
			throw new Error('Expected both players to be present at game start');
		}
		expect(snapshot.game.devMode).toBe(true);
		expect(player.resources[Resource.gold]).toBe(100);
		expect(player.resources[Resource.happiness]).toBe(10);
		expect(player.population[PopulationRole.Council]).toBe(2);
		expect(player.population[PopulationRole.Legion]).toBe(1);
		expect(player.population[PopulationRole.Fortifier]).toBe(1);
		expect(opponent.resources[Resource.castleHP]).toBe(1);
	});
});
