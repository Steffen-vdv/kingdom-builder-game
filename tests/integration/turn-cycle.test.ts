import { describe, it, expect } from 'vitest';
import { createEngine, advance } from '@kingdom-builder/engine';
import type { PhaseDef } from '@kingdom-builder/engine';
import type { StartConfig } from '@kingdom-builder/engine/config/schema';
import type { RuleSet } from '@kingdom-builder/engine/services';
import { createContentFactory } from '../../packages/engine/tests/factories/content';

const resources = {
	ap: 'turn:resource:ap',
	gold: 'turn:resource:gold',
} as const;

const phaseIds = {
	growth: 'turn:phase:growth',
	upkeep: 'turn:phase:upkeep',
	main: 'turn:phase:main',
} as const;

const phases: PhaseDef[] = [
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
};

describe('Turn cycle integration', () => {
	it('advances players through all phases sequentially', () => {
		const content = createContentFactory();
		const ctx = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases,
			start,
			rules,
		});

		while (ctx.game.currentPhase !== phaseIds.main) {
			advance(ctx);
		}
		expect(ctx.game.currentPlayerIndex).toBe(0);
		expect(ctx.game.currentPhase).toBe(phaseIds.main);

		advance(ctx);

		while (ctx.game.currentPhase !== phaseIds.main) {
			advance(ctx);
		}
		expect(ctx.game.currentPlayerIndex).toBe(1);
		expect(ctx.game.currentPhase).toBe(phaseIds.main);

		advance(ctx);

		expect(ctx.game.turn).toBe(2);
		expect(ctx.game.currentPlayerIndex).toBe(0);
		expect(ctx.game.currentPhase).toBe(phaseIds.growth);
	});
});
