import { describe, it, expect } from 'vitest';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	Resource,
	RULES,
} from '@kingdom-builder/contents';
import {
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
} from '@kingdom-builder/contents/registries/resource';
import { createContentFactory } from '@kingdom-builder/testing';
import { createEngine } from '../../src/index.ts';

const resourceCatalog = {
	resources: RESOURCE_REGISTRY,
	groups: RESOURCE_GROUP_REGISTRY,
};

describe('createEngine configuration overrides', () => {
	it('applies registry overrides via config', () => {
		const factory = createContentFactory();
		const customAction = factory.action({
			baseCosts: { [Resource.gold]: 3 },
		});
		factory.building();
		factory.development();
		const engine = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			phases: PHASES,
			rules: RULES,
			resourceCatalog,
			config: {
				actions: factory.actions.values(),
				buildings: factory.buildings.values(),
				developments: factory.developments.values(),
			},
		});
		expect(engine.actions.keys()).toEqual(factory.actions.keys());
		expect(engine.buildings.keys()).toEqual(factory.buildings.keys());
		expect(engine.developments.keys()).toEqual(factory.developments.keys());
		const createdAction = engine.actions.get(customAction.id);
		const baseCosts = createdAction.baseCosts || {};
		expect(baseCosts[Resource.gold]).toBe(3);
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
			phases: PHASES,
			rules: RULES,
			resourceCatalog,
			config: {
				actions: [],
				buildings: [],
				developments: [],
			},
			devMode: true,
		});
		expect(engine.actions.has(baseActionId)).toBe(true);
		expect(engine.game.devMode).toBe(true);
		// In dev mode, player should have 100 gold from system action
		const [playerA] = engine.game.players;
		expect(playerA.resourceValues[Resource.gold]).toBe(100);
	});
});
