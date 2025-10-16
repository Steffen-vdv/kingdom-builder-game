import { describe, it, expect } from 'vitest';
import { createEngine, advance } from '@kingdom-builder/engine';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import { createContentFactory } from '@kingdom-builder/testing';

const resources = {
	ap: 'turn:resource:ap',
	gold: 'turn:resource:gold',
} as const;

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
