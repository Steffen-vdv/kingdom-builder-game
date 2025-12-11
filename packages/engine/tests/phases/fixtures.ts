import { createEngine } from '../../src/index.ts';
import type { PhaseDef } from '../../src/phases.ts';
import type { RuleSet } from '../../src/services/index.ts';
import { RULES } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	resourceKeys,
	statKeys,
	populationKeys,
	testResourceRegistry,
	testResourceGroupRegistry,
} from './syntheticResources';

const phaseIds = {
	growth: 'synthetic:phase:growth',
	upkeep: 'synthetic:phase:upkeep',
	main: 'synthetic:phase:main',
} as const;

const stepIds = {
	raiseStrength: 'synthetic:step:growth:raise-strength',
	gainIncome: 'synthetic:step:growth:gain-income',
	gainAp: 'synthetic:step:growth:gain-ap',
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
				{
					id: stepIds.raiseStrength,
					// Legion raises army strength, Fortifier raises fortification
					effects: [
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
			],
		},
		{
			id: phaseIds.upkeep,
			steps: [
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

	const engineContext = createEngine({
		actions: content.actions,
		buildings: content.buildings,
		developments: content.developments,
		phases,
		rules,
		resourceCatalog: {
			resources: testResourceRegistry,
			groups: testResourceGroupRegistry,
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
