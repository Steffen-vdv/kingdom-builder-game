import {
	createContentFactory,
	createResourceRegistries,
	resourceDefinition,
	resourceGroupDefinition,
	type ContentFactory,
} from '@kingdom-builder/testing';
import type { PhaseDef, StartConfig } from './syntheticTaxData';
import {
	SYNTHETIC_RESOURCE_KEYS,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_POPULATION_ROLE_ID,
	SYNTHETIC_POPULATION_ROLES,
	SYNTHETIC_POPULATION_INFO,
	SYNTHETIC_LAND_INFO,
	SYNTHETIC_SLOT_INFO,
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

/**
 * No-op system action IDs used to skip initial setup.
 * These actions don't exist, so no setup effects run.
 */
export const SKIP_SETUP_ACTION_IDS = {
	initialSetup: '__synth_noop_initial__',
	initialSetupDevmode: '__synth_noop_devmode__',
	compensation: '__synth_noop_compensation__',
	compensationDevmodeB: '__synth_noop_compensation_b__',
};

export const SYNTHETIC_ASSETS = {
	resources: SYNTHETIC_RESOURCES,
	stats: {},
	populations: SYNTHETIC_POPULATION_ROLES,
	population: SYNTHETIC_POPULATION_INFO,
	land: SYNTHETIC_LAND_INFO,
	slot: SYNTHETIC_SLOT_INFO,
	passive: {},
	modifiers: {},
	formatPassiveRemoval: (description: string) =>
		`Active as long as ${description}`,
};

// Create Resource catalog for synthetic test resources
const coreGroup = resourceGroupDefinition({
	id: 'resource-group:synthetic',
	order: 0,
});

const populationGroup = resourceGroupDefinition({
	id: 'resource-group:synthetic:population',
	order: 1,
});

const synthResourceDefinitions = [
	resourceDefinition({
		id: SYNTHETIC_RESOURCE_KEYS.coin,
		metadata: {
			label: SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin].label,
			icon: SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin].icon,
			group: { id: coreGroup.id, order: 0 },
		},
		bounds: { lowerBound: 0 },
	}),
	resourceDefinition({
		id: SYNTHETIC_RESOURCE_KEYS.actionPoints,
		metadata: {
			label: SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.actionPoints].label,
			icon: SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.actionPoints].icon,
			group: { id: coreGroup.id, order: 1 },
		},
		bounds: { lowerBound: 0 },
		globalCost: 1,
	}),
	// Population role resource
	resourceDefinition({
		id: SYNTHETIC_POPULATION_ROLE_ID,
		metadata: {
			label: SYNTHETIC_POPULATION_ROLES[SYNTHETIC_POPULATION_ROLE_ID].label,
			icon: SYNTHETIC_POPULATION_ROLES[SYNTHETIC_POPULATION_ROLE_ID].icon,
			group: { id: populationGroup.id, order: 0 },
		},
		bounds: { lowerBound: 0 },
	}),
];

export const SYNTHETIC_RESOURCE_CATALOG = createResourceRegistries({
	resources: synthResourceDefinitions,
	groups: [coreGroup, populationGroup],
});

export interface SyntheticTaxScenario {
	factory: ContentFactory;
	phases: PhaseDef[];
	start: StartConfig;
	rules: typeof SYNTHETIC_RULES;
	resourceCatalog: typeof SYNTHETIC_RESOURCE_CATALOG;
}

/**
 * Build effects to apply a StartConfig.
 * Returns an array of effects that can be passed to runEffects.
 */
export function buildStartConfigEffects(startConfig: StartConfig) {
	const effects: Array<{
		type: string;
		method: string;
		params?: Record<string, unknown>;
	}> = [];

	// Apply values as resource:add effects
	if (startConfig.player.values) {
		for (const [resourceId, value] of Object.entries(
			startConfig.player.values,
		)) {
			if (typeof value === 'number' && value > 0) {
				effects.push({
					type: 'resource',
					method: 'add',
					params: {
						resourceId,
						change: { type: 'amount', amount: value },
					},
				});
			}
		}
	}

	// Apply lands via land:add effects, then add developments
	if (startConfig.player.lands) {
		for (const landConfig of startConfig.player.lands) {
			effects.push({
				type: 'land',
				method: 'add',
				params: { count: 1 },
			});
			for (const devId of landConfig.developments) {
				effects.push({
					type: 'development',
					method: 'add',
					params: { id: devId },
				});
			}
		}
	}

	return effects;
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
				params: {
					resourceId: SYNTHETIC_RESOURCE_KEYS.coin,
					change: { type: 'amount', amount: 3 },
				},
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
				params: {
					resourceId: SYNTHETIC_RESOURCE_KEYS.coin,
					change: { type: 'amount', amount: 1 },
				},
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
		baseCosts: {},
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: SYNTHETIC_RESOURCE_KEYS.coin,
					change: { type: 'amount', amount: 3 },
				},
				meta: {
					source: {
						type: 'resource',
						id: SYNTHETIC_POPULATION_ROLE_ID,
						count: 1,
					},
				},
			},
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: SYNTHETIC_RESOURCE_KEYS.coin,
					change: { type: 'amount', amount: 1 },
				},
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
			id: SYNTHETIC_PHASE_IDS.growth,
			label: 'Synthetic Growth',
			steps: [
				{
					id: SYNTHETIC_STEP_IDS.gainIncome,
					title: 'Gain Synthetic Income',
					triggers: ['onGainIncomeStep'],
				},
			],
		},
		{
			id: SYNTHETIC_PHASE_IDS.main,
			label: 'Synthetic Main',
			action: true,
			steps: [
				{
					id: SYNTHETIC_STEP_IDS.main,
					title: 'Take Synthetic Actions',
				},
			],
		},
		{
			id: SYNTHETIC_PHASE_IDS.upkeep,
			label: 'Synthetic Upkeep',
			steps: [
				{
					id: SYNTHETIC_STEP_IDS.payUpkeep,
					title: 'Synthetic Upkeep',
					triggers: ['onPayUpkeepStep'],
				},
			],
		},
	];
	const start: StartConfig = {
		player: {
			resources: {},
			stats: {},
			population: {},
			values: {
				[SYNTHETIC_RESOURCE_KEYS.coin]: 10,
				[SYNTHETIC_RESOURCE_KEYS.actionPoints]: 5,
				[SYNTHETIC_POPULATION_ROLE_ID]: 1,
			},
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
	return {
		factory,
		phases,
		start,
		rules: SYNTHETIC_RULES,
		resourceCatalog: SYNTHETIC_RESOURCE_CATALOG,
	};
}
