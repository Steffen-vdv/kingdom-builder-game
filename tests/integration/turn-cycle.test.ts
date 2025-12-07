import { describe, it, expect } from 'vitest';
import { createEngine, advance } from '@kingdom-builder/engine';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import {
	createContentFactory,
	createResourceV2Registries,
	resourceV2Definition,
} from '@kingdom-builder/testing';

const resources = {
	ap: 'resource:turn:turn-resource-ap',
	gold: 'resource:turn:turn-resource-gold',
} as const;

// Custom systemActionIds for this test since it uses a completely custom
// resource setup that doesn't include the real game resources.
const customSystemActionIds = {
	initialSetup: '__noop_turn_test__',
	initialSetupDevmode: '__noop_turn_test__',
	compensation: '__noop_turn_test__',
	compensationDevmodeB: '__noop_turn_test__',
};

const phaseIds = {
	growth: 'turn:phase:growth',
	upkeep: 'turn:phase:upkeep',
	main: 'turn:phase:main',
} as const;

const phases: PhaseConfig[] = [
	{ id: phaseIds.growth, steps: [{ id: 'turn:step:growth' }] },
	{ id: phaseIds.upkeep, steps: [{ id: 'turn:step:upkeep' }] },
	{ id: phaseIds.main, action: true, steps: [{ id: 'turn:step:main' }] },
];

const start: StartConfig = {
	player: {
		resources: { [resources.ap]: 0, [resources.gold]: 0 },
		stats: {},
		population: {},
		lands: [],
	},
};

const rules: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: resources.gold,
	tierDefinitions: [
		{
			id: 'turn:tier:baseline',
			range: { min: 0 },
			effect: { incomeMultiplier: 1 },
			passive: { id: 'turn:passive:baseline' },
		},
	],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 1,
	winConditions: [],
};

const { resources: turnResourcesV2, groups: turnResourceGroupsV2 } =
	createResourceV2Registries({
		resources: [
			resourceV2Definition({
				id: 'resource:turn:turn-resource-ap',
				metadata: { label: 'Turn Action Points', icon: '⚡' },
				bounds: { lowerBound: 0 },
			}),
			resourceV2Definition({
				id: 'resource:turn:turn-resource-gold',
				metadata: { label: 'Turn Gold', icon: '🪙' },
				bounds: { lowerBound: 0 },
			}),
		],
	});

describe('Turn cycle integration', () => {
	it('advances players through all phases sequentially', () => {
		const content = createContentFactory();
		const engineContext = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases,
			start,
			rules,
			resourceCatalogV2: {
				resources: turnResourcesV2,
				groups: turnResourceGroupsV2,
			},
			systemActionIds: customSystemActionIds,
		});

		while (engineContext.game.currentPhase !== phaseIds.main) {
			advance(engineContext);
		}
		expect(engineContext.game.currentPlayerIndex).toBe(0);
		expect(engineContext.game.currentPhase).toBe(phaseIds.main);

		advance(engineContext);

		while (engineContext.game.currentPhase !== phaseIds.main) {
			advance(engineContext);
		}
		expect(engineContext.game.currentPlayerIndex).toBe(1);
		expect(engineContext.game.currentPhase).toBe(phaseIds.main);

		advance(engineContext);

		expect(engineContext.game.turn).toBe(2);
		expect(engineContext.game.currentPlayerIndex).toBe(0);
		expect(engineContext.game.currentPhase).toBe(phaseIds.growth);
	});
});
