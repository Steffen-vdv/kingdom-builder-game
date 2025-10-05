import { PhaseId, PhaseStepId, PhaseTrigger } from '@kingdom-builder/contents';
import {
	createContentFactory,
	type ContentFactory,
} from '../../../engine/tests/factories/content';
import type { PhaseDef, StartConfig } from './syntheticTaxData';
import {
	SYNTHETIC_RESOURCE_KEYS,
	SYNTHETIC_POPULATION_ROLE_ID,
	SYNTHETIC_POPULATION_ROLES,
	SYNTHETIC_IDS,
	SYNTHETIC_PHASE_IDS,
	SYNTHETIC_STEP_IDS,
	SYNTHETIC_RULES,
} from './syntheticTaxData';

export {
	SYNTHETIC_RESOURCE_KEYS,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_POPULATION_ROLE_ID,
	SYNTHETIC_POPULATION_INFO,
	SYNTHETIC_POPULATION_ROLES,
	SYNTHETIC_LAND_INFO,
	SYNTHETIC_SLOT_INFO,
	SYNTHETIC_IDS,
	SYNTHETIC_PHASE_IDS,
	SYNTHETIC_STEP_IDS,
} from './syntheticTaxData';
export type { SyntheticResourceKey } from './syntheticTaxData';

export interface SyntheticTaxScenario {
	factory: ContentFactory;
	phases: PhaseDef[];
	start: StartConfig;
	rules: typeof SYNTHETIC_RULES;
}

export function createSyntheticTaxScenario(): SyntheticTaxScenario {
	const factory = createContentFactory();
	factory.population({
		id: SYNTHETIC_POPULATION_ROLE_ID,
		icon: SYNTHETIC_POPULATION_ROLES[SYNTHETIC_POPULATION_ROLE_ID].icon,
	});
	factory.development({
		id: SYNTHETIC_IDS.farmDevelopment,
		icon: '🌾',
		onGainIncomeStep: [
			{
				type: 'resource',
				method: 'add',
				params: { key: SYNTHETIC_RESOURCE_KEYS.coin, amount: 3 },
				meta: {
					source: {
						type: 'development',
						id: SYNTHETIC_IDS.farmDevelopment,
					},
				},
			},
		],
	});
	factory.building({ id: SYNTHETIC_IDS.marketBuilding, icon: '🏦', costs: {} });
	factory.building({
		id: SYNTHETIC_IDS.millBuilding,
		icon: '🪵',
		costs: {},
		onGainIncomeStep: [
			{
				type: 'resource',
				method: 'add',
				params: { key: SYNTHETIC_RESOURCE_KEYS.coin, amount: 1 },
				meta: {
					source: {
						type: 'building',
						id: SYNTHETIC_IDS.millBuilding,
					},
				},
			},
		],
	});
	factory.building({ id: SYNTHETIC_IDS.raidersGuild, icon: '⚔️', costs: {} });
	factory.buildings.get(SYNTHETIC_IDS.raidersGuild).upkeep = {
		[SYNTHETIC_RESOURCE_KEYS.coin]: 2,
	};
	factory.action({
		id: SYNTHETIC_IDS.taxAction,
		name: 'Synthetic Levy',
		icon: '📜',
		baseCosts: {
			[SYNTHETIC_RESOURCE_KEYS.actionPoints]: 1,
		},
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: { key: SYNTHETIC_RESOURCE_KEYS.coin, amount: 3 },
				meta: {
					source: {
						type: 'population',
						id: SYNTHETIC_POPULATION_ROLE_ID,
						count: 1,
					},
				},
			},
			{
				type: 'resource',
				method: 'add',
				params: { key: SYNTHETIC_RESOURCE_KEYS.coin, amount: 1 },
				meta: {
					source: {
						type: 'building',
						id: SYNTHETIC_IDS.marketBuilding,
					},
				},
			},
		],
	});
	const phases: PhaseDef[] = [
		{
			id: SYNTHETIC_PHASE_IDS[PhaseId.Growth],
			label: 'Synthetic Growth',
			steps: [
				{
					id: SYNTHETIC_STEP_IDS[PhaseStepId.GainIncome],
					title: 'Gain Synthetic Income',
					triggers: [PhaseTrigger.OnGainIncomeStep],
				},
			],
		},
		{
			id: SYNTHETIC_PHASE_IDS[PhaseId.Main],
			label: 'Synthetic Main',
			action: true,
			steps: [],
		},
		{
			id: SYNTHETIC_PHASE_IDS[PhaseId.Upkeep],
			label: 'Synthetic Upkeep',
			steps: [
				{
					id: SYNTHETIC_STEP_IDS[PhaseStepId.PayUpkeep],
					title: 'Synthetic Upkeep',
					triggers: [PhaseTrigger.OnPayUpkeepStep],
				},
			],
		},
	];
	const start: StartConfig = {
		player: {
			resources: {
				[SYNTHETIC_RESOURCE_KEYS.coin]: 10,
				[SYNTHETIC_RESOURCE_KEYS.actionPoints]: 5,
			},
			stats: {},
			population: { [SYNTHETIC_POPULATION_ROLE_ID]: 1 },
			lands: [
				{
					id: SYNTHETIC_IDS.homeLand,
					developments: [SYNTHETIC_IDS.farmDevelopment],
					slotsMax: 1,
					slotsUsed: 1,
					tilled: true,
				},
			],
		},
	};
	return { factory, phases, start, rules: SYNTHETIC_RULES };
}
