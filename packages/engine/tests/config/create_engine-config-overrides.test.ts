import { describe, it, expect } from 'vitest';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	GAME_START,
	PHASES,
	POPULATIONS,
	Resource,
	RULES,
	Stat,
} from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { createEngine } from '../../src/index.ts';
import type { StartConfig } from '@kingdom-builder/protocol';

describe('createEngine configuration overrides', () => {
	it('applies registry overrides and start configuration', () => {
		const factory = createContentFactory();
		const customAction = factory.action({
			baseCosts: { [Resource.gold]: 3 },
		});
		factory.building();
		factory.development();
		const customPopulation = factory.population();
		const customStart: StartConfig = {
			player: {
				resources: {
					[Resource.gold]: 11,
					[Resource.ap]: 0,
				},
				stats: { [Stat.maxPopulation]: 2 },
				population: { [customPopulation.id]: 1 },
			},
			players: {
				A: { resources: { [Resource.gold]: 13 } },
				B: { resources: { [Resource.gold]: 17 } },
			},
		};
		const engine = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
			config: {
				actions: factory.actions.values(),
				buildings: factory.buildings.values(),
				developments: factory.developments.values(),
				populations: factory.populations.values(),
				start: customStart,
			},
		});
		expect(engine.actions.keys()).toEqual(factory.actions.keys());
		expect(engine.buildings.keys()).toEqual(factory.buildings.keys());
		expect(engine.developments.keys()).toEqual(factory.developments.keys());
		expect(engine.populations.keys()).toEqual(factory.populations.keys());
		const [playerA, playerB] = engine.game.players;
		// PlayerState uses resourceValues for all resources/population
		expect(playerA.resourceValues[Resource.gold]).toBe(13);
		expect(playerB.resourceValues[Resource.gold]).toBe(17);
		expect(playerA.resourceValues[customPopulation.id]).toBe(1);
		const createdAction = engine.actions.get(customAction.id);
		const baseCosts = createdAction.baseCosts || {};
		expect(baseCosts[Resource.gold]).toBe(3);
		expect(engine.compensations.A.resources?.[Resource.gold]).toBe(13);
		expect(engine.compensations.B.resources?.[Resource.gold]).toBe(17);
		const baseActionId = customAction.id;
		expect(engine.actions.has(baseActionId)).toBe(true);
	});

	it('retains base registries when config definitions are empty', () => {
		const baseActionId = ACTIONS.keys()[0];
		if (!baseActionId) {
			throw new Error('Expected at least one default action definition.');
		}
		const engine = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
			config: {
				actions: [],
				buildings: [],
				developments: [],
				populations: [],
			},
			devMode: true,
		});
		expect(engine.actions.has(baseActionId)).toBe(true);
		expect(engine.game.devMode).toBe(true);
		const goldKey = Resource.gold;
		const devGold = GAME_START.modes?.dev?.player?.resources?.[goldKey];
		if (typeof devGold === 'number') {
			const [playerA] = engine.game.players;
			expect(playerA.resourceValues[goldKey]).toBe(devGold);
		}
	});
});
