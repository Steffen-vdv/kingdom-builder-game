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
	resourceAmountParams,
	resourcePercentFromResourceParams,
} from '../helpers/resourceParams.ts';
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

export function createPhaseTestEnvironment() {
	const content = createContentFactory();

	const farm = content.development({
		id: 'synthetic:development:farm',
		onGainIncomeStep: [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: resourceKeys.gold,
					amount: FARM_INCOME,
				}),
			},
		],
	});

	const council = content.population({
		id: 'synthetic:population:council',
		onGainAPStep: [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: resourceKeys.ap,
					amount: AP_GAIN_PER_COUNCIL,
				}),
			},
		],
		onPayUpkeepStep: [
			{
				type: 'resource',
				method: 'remove',
				params: resourceAmountParams({
					key: resourceKeys.gold,
					amount: COUNCIL_UPKEEP,
				}),
			},
		],
	});

	const legion = content.population({
		id: 'synthetic:population:legion',
		onGrowthPhase: [
			{
				type: 'resource',
				method: 'add',
				params: resourcePercentFromResourceParams({
					key: statKeys.army,
					sourceResourceId: statKeys.growth,
					roundingMode: 'up',
					additive: true,
				}),
			},
		],
		onPayUpkeepStep: [
			{
				type: 'resource',
				method: 'remove',
				params: resourceAmountParams({
					key: resourceKeys.gold,
					amount: LEGION_UPKEEP,
				}),
			},
		],
	});

	const fortifier = content.population({
		id: 'synthetic:population:fortifier',
		onGrowthPhase: [
			{
				type: 'resource',
				method: 'add',
				params: resourcePercentFromResourceParams({
					key: statKeys.fort,
					sourceResourceId: statKeys.growth,
					roundingMode: 'up',
					additive: true,
				}),
			},
		],
		onPayUpkeepStep: [
			{
				type: 'resource',
				method: 'remove',
				params: resourceAmountParams({
					key: resourceKeys.gold,
					amount: FORTIFIER_UPKEEP,
				}),
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
				},
				{ id: stepIds.gainIncome, triggers: ['onGainIncomeStep'] },
				{ id: stepIds.gainAp, triggers: ['onGainAPStep'] },
			],
		},
		{
			id: phaseIds.upkeep,
			steps: [
				{
					id: stepIds.upkeepTriggers,
					triggers: [PhaseTrigger.OnUpkeepPhase],
				},
				{ id: stepIds.payUpkeep, triggers: ['onPayUpkeepStep'] },
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
		resource(council.id).label('Council').icon('👔').lowerBound(0).build(),
		resource(legion.id).label('Legion').icon('🛡️').lowerBound(0).build(),
		resource(fortifier.id).label('Fortifier').icon('🏗️').lowerBound(0).build(),
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
		populations: content.populations,
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
	playerA.resourceValues[council.id] = STARTING_COUNCILS;
	playerA.resourceValues[legion.id] = 0;
	playerA.resourceValues[fortifier.id] = 0;

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
			council: council.id,
			legion: legion.id,
			fortifier: fortifier.id,
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
