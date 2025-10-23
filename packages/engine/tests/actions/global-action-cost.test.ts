import { describe, it, expect } from 'vitest';
import {
	createEngine,
	getActionCosts,
	performAction,
	advance,
} from '../../src/index.ts';
import { PHASES, RULES, Resource } from '@kingdom-builder/contents';
import type { StartConfig } from '@kingdom-builder/protocol';
import { createContentFactory } from '@kingdom-builder/testing';

describe('ResourceV2 global action cost', () => {
	it('defaults action costs to the declared pointer amount', () => {
		const content = createContentFactory();
		content.resourceDefinition({
			id: Resource.ap,
			order: 0,
			configure: (builder) => {
				builder.lowerBound(0).globalActionCost(3);
			},
		});
		content.resourceDefinition({
			id: Resource.gold,
			order: 1,
			configure: (builder) => builder.lowerBound(0),
		});
		const action = content.action({
			id: 'pointer-default-action',
			baseCosts: {},
			effects: [],
		});
		const start: StartConfig = {
			player: {
				resources: {
					[Resource.ap]: 5,
					[Resource.gold]: 0,
				},
				stats: {},
				population: {},
			},
			players: {},
		};
		const engine = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases: PHASES,
			start,
			rules: { ...RULES },
			resourceDefinitions: content.resourceDefinitions.values(),
			resourceGroups: content.resourceGroups.values(),
		});
		expect(engine.actionCostResource).toBe(Resource.ap);
		expect(engine.actionCostAmount).toBe(3);

		const costs = getActionCosts(action.id, engine);
		expect(costs[Resource.ap]).toBe(3);

		advance(engine);
		engine.activePlayer.ap = 5;
		performAction(action.id, engine);
		expect(engine.activePlayer.ap).toBe(2);
	});
});
