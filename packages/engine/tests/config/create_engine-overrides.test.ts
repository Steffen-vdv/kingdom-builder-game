import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/index.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource } from '@kingdom-builder/contents';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';
import type {
	GameConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '../../src/phases.ts';

const resourceCatalogV2 = {
	resources: RESOURCE_V2_REGISTRY,
	groups: RESOURCE_GROUP_V2_REGISTRY,
};

// Use actual ResourceV2 IDs - they ARE the resource keys directly
const RESOURCE_AP = CResource.ap;
const RESOURCE_GOLD = CResource.gold;

const PHASES: PhaseDef[] = [
	{
		id: 'test:phase:main',
		action: true,
		steps: [{ id: 'test:step:main' }],
	},
];

const START: StartConfig = {
	player: {
		resources: {
			[RESOURCE_AP]: 2,
			[RESOURCE_GOLD]: 1,
		},
		stats: {},
		population: {},
		lands: [],
	},
};

const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: RESOURCE_GOLD,
	tierDefinitions: [
		{
			id: 'test:tier:baseline',
			range: { min: 0 },
			effect: { incomeMultiplier: 1 },
		},
	],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 5,
	winConditions: [],
};

describe('createEngine config overrides', () => {
	it('overrides registries and the start configuration when config is provided', () => {
		const baseContent = createContentFactory();
		const overrideContent = createContentFactory();
		const baseAction = baseContent.action({ name: 'base:action' });
		const overrideAction = overrideContent.action({ name: 'override:action' });
		const config: GameConfig = {
			actions: [overrideAction],
			start: {
				player: {
					resources: {
						[RESOURCE_AP]: 4,
						[RESOURCE_GOLD]: 7,
					},
					stats: {},
					population: {},
					lands: [],
				},
			},
		};
		const engine = createEngine({
			actions: baseContent.actions,
			buildings: baseContent.buildings,
			developments: baseContent.developments,
			populations: baseContent.populations,
			phases: PHASES,
			start: START,
			rules: RULES,
			resourceCatalogV2,
			config,
		});
		expect(engine.actions).not.toBe(baseContent.actions);
		expect(() => engine.actions.get(overrideAction.id)).not.toThrow();
		expect(() => engine.actions.get(baseAction.id)).toThrowError(/Unknown id/);
		const [playerA, playerB] = engine.game.players;
		// PlayerState uses resourceValues for all resources
		expect(playerA?.resourceValues[RESOURCE_AP]).toBe(4);
		expect(playerA?.resourceValues[RESOURCE_GOLD]).toBe(7);
		expect(playerB?.resourceValues[RESOURCE_AP]).toBe(4);
		expect(playerB?.resourceValues[RESOURCE_GOLD]).toBe(7);
	});

	it('retains original registries when config omits optional definitions', () => {
		const baseContent = createContentFactory();
		const config: GameConfig = {
			actions: [],
		};
		const engine = createEngine({
			actions: baseContent.actions,
			buildings: baseContent.buildings,
			developments: baseContent.developments,
			populations: baseContent.populations,
			phases: PHASES,
			start: START,
			rules: RULES,
			resourceCatalogV2,
			config,
		});
		expect(engine.actions).toBe(baseContent.actions);
		const [playerA] = engine.game.players;
		expect(playerA?.resourceValues[RESOURCE_AP]).toBe(2);
		expect(playerA?.resourceValues[RESOURCE_GOLD]).toBe(1);
	});
});
