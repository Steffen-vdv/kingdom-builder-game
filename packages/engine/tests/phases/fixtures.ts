import { createEngine } from '../../src/index.ts';
import type { PhaseDef } from '../../src/phases.ts';
import type { StartConfig } from '@kingdom-builder/protocol';
import type { RuleSet } from '../../src/services/index.ts';
import { PhaseTrigger, RULES } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

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
				type: 'stat',
				method: 'add_pct',
				params: { key: statKeys.army, percentStat: statKeys.growth },
				round: 'up',
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
				type: 'stat',
				method: 'add_pct',
				params: { key: statKeys.fort, percentStat: statKeys.growth },
				round: 'up',
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
									left: { type: 'stat', params: { key: statKeys.war } },
									operator: 'gt',
									right: 0,
								},
							},
							effects: [
								{
									type: 'stat',
									method: 'remove',
									params: { key: statKeys.war, amount: 1 },
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

	const start: StartConfig = {
		player: {
			resources: {
				[resourceKeys.ap]: BASE_AP,
				[resourceKeys.gold]: 0,
			},
			stats: {
				[statKeys.army]: 0,
				[statKeys.fort]: 0,
				[statKeys.growth]: BASE_GROWTH,
				[statKeys.war]: 0,
			},
			population: {
				[council.id]: STARTING_COUNCILS,
				[legion.id]: 0,
				[fortifier.id]: 0,
			},
			lands: [{ developments: [farm.id] }],
		},
		players: {
			B: {
				resources: {
					[resourceKeys.ap]: BASE_AP + AP_COMPENSATION,
				},
			},
		},
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
		populations: content.populations,
		phases,
		start,
		rules,
	});

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
