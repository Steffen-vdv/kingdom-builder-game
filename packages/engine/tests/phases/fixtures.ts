import { createEngine } from '../../src/index.ts';
import type { PhaseDef } from '../../src/phases.ts';
import type { RuleSet } from '../../src/services/index.ts';
import {
	PhaseTrigger,
	RULES,
	resource,
	createResourceRegistry,
} from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
} from '@kingdom-builder/contents/registries/resource';

const resourceKeys = {
	ap: 'synthetic:resource:ap',
	gold: 'synthetic:resource:gold',
} as const;

const statKeys = {
	army: 'synthetic:stat:army-strength',
	fort: 'synthetic:stat:fort-strength',
	growth: 'synthetic:stat:growth',
	war: 'synthetic:stat:war-weariness',
} as const;

const phaseIds = {
	growth: 'synthetic:phase:growth',
	upkeep: 'synthetic:phase:upkeep',
	main: 'synthetic:phase:main',
} as const;

const stepIds = {
	growthTriggers: 'synthetic:step:growth:triggers',
	gainIncome: 'synthetic:step:growth:gain-income',
	gainAp: 'synthetic:step:growth:gain-ap',
	upkeepTriggers: 'synthetic:step:upkeep:triggers',
	payUpkeep: 'synthetic:step:upkeep:pay',
	warRecovery: 'synthetic:step:upkeep:war-recovery',
	main: 'synthetic:step:main',
} as const;

const AP_GAIN_PER_COUNCIL = 2;
const FARM_INCOME = 4;
const BASE_AP = 0;
const AP_COMPENSATION = 1;
const BASE_GROWTH = 0.5;
const COUNCIL_UPKEEP = 1;
const LEGION_UPKEEP = 2;
const FORTIFIER_UPKEEP = 2;
const STARTING_COUNCILS = 1;

// Population resource IDs - under ResourceV2, populations are just resources
const populationKeys = {
	council: 'synthetic:population:council',
	legion: 'synthetic:population:legion',
	fortifier: 'synthetic:population:fortifier',
} as const;

export function createPhaseTestEnvironment() {
	const content = createContentFactory();

	const farm = content.development({
		id: 'synthetic:development:farm',
		onGainIncomeStep: [
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: resourceKeys.gold,
					change: { type: 'amount', amount: FARM_INCOME },
				},
			},
		],
	});

	const phases: PhaseDef[] = [
		{
			id: phaseIds.growth,
			steps: [
				{
					id: stepIds.growthTriggers,
					triggers: [PhaseTrigger.OnGrowthPhase],
					// Legion and Fortifier stat growth - use resource evaluators
					effects: [
						// Legion grants army strength growth (base_army * growth_rate * legion_count)
						{
							evaluator: {
								type: 'resource',
								params: { resourceId: populationKeys.legion },
							},
							effects: [
								{
									type: 'resource',
									method: 'add',
									params: {
										resourceId: statKeys.army,
										change: {
											type: 'percentFromResource',
											sourceResourceId: statKeys.growth,
											roundingMode: 'up',
											additive: true,
										},
									},
								},
							],
						},
						// Fortifier grants fort strength growth (base_fort * growth_rate * fort_count)
						{
							evaluator: {
								type: 'resource',
								params: { resourceId: populationKeys.fortifier },
							},
							effects: [
								{
									type: 'resource',
									method: 'add',
									params: {
										resourceId: statKeys.fort,
										change: {
											type: 'percentFromResource',
											sourceResourceId: statKeys.growth,
											roundingMode: 'up',
											additive: true,
										},
									},
								},
							],
						},
					],
				},
				{ id: stepIds.gainIncome, triggers: ['onGainIncomeStep'] },
				{
					id: stepIds.gainAp,
					// Council members grant AP - use resource evaluator
					effects: [
						{
							evaluator: {
								type: 'resource',
								params: { resourceId: populationKeys.council },
							},
							effects: [
								{
									type: 'resource',
									method: 'add',
									params: {
										resourceId: resourceKeys.ap,
										change: { type: 'amount', amount: AP_GAIN_PER_COUNCIL },
									},
								},
							],
						},
					],
				},
			],
		},
		{
			id: phaseIds.upkeep,
			steps: [
				{
					id: stepIds.upkeepTriggers,
					triggers: [PhaseTrigger.OnUpkeepPhase],
				},
				{
					id: stepIds.payUpkeep,
					// Population upkeep - use resource evaluators
					effects: [
						{
							evaluator: {
								type: 'resource',
								params: { resourceId: populationKeys.council },
							},
							effects: [
								{
									type: 'resource',
									method: 'remove',
									params: {
										resourceId: resourceKeys.gold,
										change: { type: 'amount', amount: COUNCIL_UPKEEP },
									},
								},
							],
						},
						{
							evaluator: {
								type: 'resource',
								params: { resourceId: populationKeys.legion },
							},
							effects: [
								{
									type: 'resource',
									method: 'remove',
									params: {
										resourceId: resourceKeys.gold,
										change: { type: 'amount', amount: LEGION_UPKEEP },
									},
								},
							],
						},
						{
							evaluator: {
								type: 'resource',
								params: { resourceId: populationKeys.fortifier },
							},
							effects: [
								{
									type: 'resource',
									method: 'remove',
									params: {
										resourceId: resourceKeys.gold,
										change: { type: 'amount', amount: FORTIFIER_UPKEEP },
									},
								},
							],
						},
					],
				},
				{
					id: stepIds.warRecovery,
					effects: [
						{
							evaluator: {
								type: 'compare',
								params: {
									left: {
										type: 'resource',
										params: { resourceId: statKeys.war },
									},
									operator: 'gt',
									right: 0,
								},
							},
							effects: [
								{
									type: 'resource',
									method: 'remove',
									params: {
										resourceId: statKeys.war,
										change: { type: 'amount', amount: 1 },
									},
								},
							],
						},
					],
				},
			],
		},
		{
			id: phaseIds.main,
			action: true,
			steps: [{ id: stepIds.main }],
		},
	];

	// No-op system action IDs to skip initial setup
	const SKIP_SETUP_ACTION_IDS = {
		initialSetup: '__noop_initial_setup__',
		initialSetupDevmode: '__noop_initial_setup_devmode__',
		compensation: '__noop_compensation__',
		compensationDevmodeB: '__noop_compensation_devmode_b__',
	};

	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down',
		tieredResourceKey: resourceKeys.gold,
		tierDefinitions: [
			{
				id: 'synthetic:tier:baseline',
				range: { min: 0 },
				effect: { incomeMultiplier: 1 },
				passive: { id: 'synthetic:passive:baseline' },
			},
		],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 6,
		winConditions: RULES.winConditions,
	};

	// Create synthetic Resource definitions for testing
	const syntheticResourceDefs = [
		resource(resourceKeys.ap)
			.label('Action Points')
			.icon('⚡')
			.lowerBound(0)
			.build(),
		resource(resourceKeys.gold).label('Gold').icon('💰').lowerBound(0).build(),
		resource(statKeys.army)
			.label('Army Strength')
			.icon('⚔️')
			.lowerBound(0)
			.build(),
		resource(statKeys.fort)
			.label('Fort Strength')
			.icon('🏰')
			.lowerBound(0)
			.build(),
		resource(statKeys.growth)
			.label('Growth')
			.icon('📈')
			.lowerBound(0)
			.allowDecimal()
			.build(),
		resource(statKeys.war)
			.label('War Weariness')
			.icon('😟')
			.lowerBound(0)
			.build(),
		resource(populationKeys.council)
			.label('Council')
			.icon('👔')
			.lowerBound(0)
			.build(),
		resource(populationKeys.legion)
			.label('Legion')
			.icon('🛡️')
			.lowerBound(0)
			.build(),
		resource(populationKeys.fortifier)
			.label('Fortifier')
			.icon('🏗️')
			.lowerBound(0)
			.build(),
	];

	// Create combined registry with real + synthetic resources
	const allResourceDefs = [
		...RESOURCE_REGISTRY.ordered,
		...syntheticResourceDefs,
	];
	const testResourceRegistry = createResourceRegistry(allResourceDefs);

	const engineContext = createEngine({
		actions: content.actions,
		buildings: content.buildings,
		developments: content.developments,
		phases,
		rules,
		resourceCatalog: {
			resources: testResourceRegistry,
			groups: RESOURCE_GROUP_REGISTRY,
		},
		systemActionIds: SKIP_SETUP_ACTION_IDS,
	});

	// Manually set up initial state (previously handled by start config)
	const playerA = engineContext.game.players[0]!;
	const playerB = engineContext.game.players[1]!;

	// Player A initial state
	playerA.resourceValues[resourceKeys.ap] = BASE_AP;
	playerA.resourceValues[resourceKeys.gold] = 0;
	playerA.resourceValues[statKeys.army] = 0;
	playerA.resourceValues[statKeys.fort] = 0;
	playerA.resourceValues[statKeys.growth] = BASE_GROWTH;
	playerA.resourceValues[statKeys.war] = 0;
	playerA.resourceValues[populationKeys.council] = STARTING_COUNCILS;
	playerA.resourceValues[populationKeys.legion] = 0;
	playerA.resourceValues[populationKeys.fortifier] = 0;

	// Add land with farm development
	const land = {
		id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
		slotsMax: 1,
		slotsUsed: 1,
		developments: [farm.id],
		tilled: false,
	};
	playerA.lands.push(land);

	// Player B gets compensation AP
	playerB.resourceValues[resourceKeys.ap] = BASE_AP + AP_COMPENSATION;

	return {
		engineContext,
		phases,
		ids: {
			phases: phaseIds,
			steps: stepIds,
		},
		roles: {
			council: populationKeys.council,
			legion: populationKeys.legion,
			fortifier: populationKeys.fortifier,
		},
		resources: resourceKeys,
		stats: statKeys,
		values: {
			baseAp: BASE_AP,
			apCompensation: AP_COMPENSATION,
			baseGrowth: BASE_GROWTH,
			councilApGain: AP_GAIN_PER_COUNCIL,
			farmIncome: FARM_INCOME,
			upkeep: {
				council: COUNCIL_UPKEEP,
				legion: LEGION_UPKEEP,
				fortifier: FORTIFIER_UPKEEP,
			},
			startingCouncils: STARTING_COUNCILS,
		},
	} as const;
}
