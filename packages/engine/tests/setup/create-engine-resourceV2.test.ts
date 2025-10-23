import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/setup/create_engine';
import {
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	Registry,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type PopulationConfig,
	type PhaseConfig,
	type RuleSet,
	type StartConfig,
} from '@kingdom-builder/protocol';
import {
	createResourceV2GroupRegistry,
	createResourceV2Registry,
	resourceV2,
} from '@kingdom-builder/contents';
import { setResourceValue } from '../../src/resourceV2';

describe('createEngine – ResourceV2 integration', () => {
	function createRuleSet(): RuleSet {
		return {
			defaultActionAPCost: 1,
			absorptionCapPct: 100,
			absorptionRounding: 'nearest',
			tieredResourceKey: 'focus',
			tierDefinitions: [],
			slotsPerNewLand: 2,
			maxSlotsPerLand: 3,
			basePopulationCap: 3,
			winConditions: [],
		};
	}

	function createPhases(): PhaseConfig[] {
		return [
			{
				id: 'main',
				steps: [{ id: 'action' }],
			},
		];
	}

	it('initialises ResourceV2 state and keeps legacy shims in sync', () => {
		const resourceDefinitions = createResourceV2Registry();
		resourceDefinitions.add(
			resourceV2('alpha')
				.label('Alpha')
				.description('Primary resource.')
				.order(1)
				.globalActionCost(1)
				.build(),
		);
		resourceDefinitions.add(
			resourceV2('focus')
				.label('Focus')
				.description('Stat track.')
				.order(2)
				.build(),
		);
		resourceDefinitions.add(
			resourceV2('worker')
				.label('Worker')
				.description('Population role.')
				.order(3)
				.build(),
		);
		const resourceGroups = createResourceV2GroupRegistry();
		const actions = new Registry<ActionConfig>(actionSchema);
		actions.add('spend-alpha', {
			id: 'spend-alpha',
			name: 'Spend Alpha',
			baseCosts: { alpha: 1 },
			requirements: [],
			effects: [],
		});
		const buildings = new Registry<BuildingConfig>(buildingSchema);
		const developments = new Registry<DevelopmentConfig>(developmentSchema);
		const populations = new Registry<PopulationConfig>(populationSchema);
		const start: StartConfig = {
			player: {
				resources: { alpha: 4 },
				stats: { focus: 2 },
				population: { worker: 1 },
			},
		};
		const context = createEngine({
			actions,
			buildings,
			developments,
			populations,
			phases: createPhases(),
			start,
			rules: createRuleSet(),
			resourceDefinitions: resourceDefinitions.values(),
			resourceGroups: resourceGroups.values(),
		});
		expect(context.resourceV2Metadata).toBeDefined();
		expect(context.resourceV2).toBeDefined();
		expect(context.actionCostResource).toBe('alpha');
		expect(context.actionCostAmount).toBe(1);
		const player = context.game.players[0]!;
		expect(player.resourceV2).toBeDefined();
		expect(player.resources.alpha).toBe(4);
		expect(player.stats.focus).toBe(2);
		expect(player.population.worker).toBe(1);
		expect(player.statsHistory.focus).toBe(true);
		setResourceValue(player.resourceV2!, 'alpha', 7);
		expect(player.resources.alpha).toBe(7);
	});

	it('throws when ResourceV2 definitions are missing for start config keys', () => {
		const resourceDefinitions = createResourceV2Registry();
		resourceDefinitions.add(
			resourceV2('alpha')
				.label('Alpha')
				.description('Primary resource.')
				.order(1)
				.build(),
		);
		const resourceGroups = createResourceV2GroupRegistry();
		const actions = new Registry<ActionConfig>(actionSchema);
		const buildings = new Registry<BuildingConfig>(buildingSchema);
		const developments = new Registry<DevelopmentConfig>(developmentSchema);
		const populations = new Registry<PopulationConfig>(populationSchema);
		const start: StartConfig = {
			player: {
				resources: { alpha: 2, beta: 1 },
			},
		};
		expect(() =>
			createEngine({
				actions,
				buildings,
				developments,
				populations,
				phases: createPhases(),
				start,
				rules: createRuleSet(),
				resourceDefinitions: resourceDefinitions.values(),
				resourceGroups: resourceGroups.values(),
			}),
		).toThrowError(/ResourceV2 definition missing/);
	});
});
