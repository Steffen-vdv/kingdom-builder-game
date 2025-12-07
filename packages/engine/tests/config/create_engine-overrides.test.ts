import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/index.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource } from '@kingdom-builder/contents';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';
import type { GameConfig, RuleSet } from '@kingdom-builder/protocol';
import type { PhaseDef } from '../../src/phases.ts';

const resourceCatalogV2 = {
	resources: RESOURCE_V2_REGISTRY,
	groups: RESOURCE_GROUP_V2_REGISTRY,
};

// Use actual ResourceV2 IDs - they ARE the resource keys directly
const RESOURCE_GOLD = CResource.gold;

const PHASES: PhaseDef[] = [
	{
		id: 'test:phase:main',
		action: true,
		steps: [{ id: 'test:step:main' }],
	},
];

// No-op system action IDs to skip initial setup
const SKIP_SETUP_ACTION_IDS = {
	initialSetup: '__noop_initial_setup__',
	initialSetupDevmode: '__noop_initial_setup_devmode__',
	compensation: '__noop_compensation__',
	compensationDevmodeB: '__noop_compensation_devmode_b__',
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
	it('overrides registries when config is provided', () => {
		const baseContent = createContentFactory();
		const overrideContent = createContentFactory();
		const baseAction = baseContent.action({ name: 'base:action' });
		const overrideAction = overrideContent.action({ name: 'override:action' });
		const config: GameConfig = {
			actions: [overrideAction],
		};
		const engine = createEngine({
			actions: baseContent.actions,
			buildings: baseContent.buildings,
			developments: baseContent.developments,
			populations: baseContent.populations,
			phases: PHASES,
			rules: RULES,
			resourceCatalogV2,
			config,
			systemActionIds: SKIP_SETUP_ACTION_IDS,
		});
		expect(engine.actions).not.toBe(baseContent.actions);
		expect(() => engine.actions.get(overrideAction.id)).not.toThrow();
		expect(() => engine.actions.get(baseAction.id)).toThrowError(/Unknown id/);
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
			rules: RULES,
			resourceCatalogV2,
			config,
			systemActionIds: SKIP_SETUP_ACTION_IDS,
		});
		expect(engine.actions).toBe(baseContent.actions);
	});
});
