import { describe, it, expect } from 'vitest';
import {
	ACTIONS,
	ACTION_META_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	Resource,
	RULES,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
} from '@boardsmith/contents';
import { getActionTierConfig } from '@boardsmith/protocol';
import { createContentFactory } from '@boardsmith/testing';
import { createEngine } from '../../src/index.ts';

const resourceCatalog = {
	resources: RESOURCE_REGISTRY,
	groups: RESOURCE_GROUP_REGISTRY,
};

describe('createEngine configuration overrides', () => {
	it('applies registry overrides via config', () => {
		const factory = createContentFactory();
		const customAction = factory.action({
			tiers: {
				'1': {
					costs: { [Resource.gold]: 3 },
					effects: [],
				},
			},
		});
		factory.building();
		factory.development();
		const engine = createEngine({
			actions: ACTIONS,
			actionMetaCategories: ACTION_META_CATEGORIES,
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
		const tierConfig = getActionTierConfig(createdAction, 1);
		expect(tierConfig.costs[Resource.gold]).toBe(3);
	});

	it('retains base registries when config definitions are empty', () => {
		const baseActionId = ACTIONS.keys()[0];
		if (!baseActionId) {
			throw new Error('Expected at least one default action definition.');
		}
		const engine = createEngine({
			actions: ACTIONS,
			actionMetaCategories: ACTION_META_CATEGORIES,
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
		});
		expect(engine.actions.has(baseActionId)).toBe(true);
		// Starting resources come from content package (base = 10 gold)
		const [playerA] = engine.game.players;
		expect(playerA.resourceValues[Resource.gold]).toBe(10);
	});
});
