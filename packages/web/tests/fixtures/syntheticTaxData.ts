import type { PhaseDef, RuleSet, StartConfig } from '@kingdom-builder/protocol';

type SyntheticContent = {
	resourceKeys: {
		coin: string;
		actionPoints: string;
	};
	resources: Record<string, { icon: string; label: string }>;
	populationRoleId: string;
	populationInfo: { icon: string; label: string };
	populationRoles: Record<string, { icon: string; label: string }>;
	landInfo: { icon: string; label: string };
	slotInfo: { icon: string; label: string };
	ids: Record<
		| 'taxAction'
		| 'marketBuilding'
		| 'millBuilding'
		| 'raidersGuild'
		| 'farmDevelopment'
		| 'homeLand',
		string
	>;
	phaseIds: Record<string, string>;
	stepIds: Record<'gainIncome' | 'main' | 'payUpkeep', string>;
};

const syntheticData: SyntheticContent = {
	resourceKeys: {
		coin: 'resource:synthetic:coin',
		actionPoints: 'resource:synthetic:ap',
	},
	resources: {
		'resource:synthetic:coin': { icon: '🪙', label: 'Synthetic Coin' },
		'resource:synthetic:ap': { icon: '🛠️', label: 'Synthetic Action Points' },
	},
	populationRoleId: 'population:synthetic:settler',
	populationInfo: { icon: '👥', label: 'Synthetic Population' },
	populationRoles: {
		'population:synthetic:settler': { icon: '🧑‍🌾', label: 'Synthetic Settler' },
	},
	landInfo: { icon: '🗺️', label: 'Synthetic Land' },
	slotInfo: { icon: '🧱', label: 'Synthetic Slot' },
	ids: {
		taxAction: 'action:synthetic:levy',
		marketBuilding: 'building:synthetic:market',
		millBuilding: 'building:synthetic:windmill',
		raidersGuild: 'building:synthetic:raider-hall',
		farmDevelopment: 'development:synthetic:orchard',
		homeLand: 'land:synthetic:homestead',
	},
	phaseIds: {
		growth: 'phase:synthetic:growth',
		main: 'phase:synthetic:main',
		upkeep: 'phase:synthetic:upkeep',
	},
	stepIds: {
		gainIncome: 'step:synthetic:gain-income',
		main: 'step:synthetic:perform-actions',
		payUpkeep: 'step:synthetic:pay-upkeep',
	},
};

export const SYNTHETIC_RESOURCE_KEYS = syntheticData.resourceKeys;
export type SyntheticResourceKey =
	(typeof SYNTHETIC_RESOURCE_KEYS)[keyof typeof SYNTHETIC_RESOURCE_KEYS];
export const SYNTHETIC_RESOURCES = syntheticData.resources;
export const SYNTHETIC_POPULATION_ROLE_ID = syntheticData.populationRoleId;
export const SYNTHETIC_POPULATION_INFO = syntheticData.populationInfo;
export const SYNTHETIC_POPULATION_ROLES = syntheticData.populationRoles;
export const SYNTHETIC_LAND_INFO = syntheticData.landInfo;
export const SYNTHETIC_SLOT_INFO = syntheticData.slotInfo;
export const SYNTHETIC_IDS = syntheticData.ids;
export const SYNTHETIC_PHASE_IDS = syntheticData.phaseIds;
export const SYNTHETIC_STEP_IDS = syntheticData.stepIds;

export const SYNTHETIC_RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: SYNTHETIC_RESOURCE_KEYS.coin,
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 2,
	winConditions: [],
};

export type { PhaseDef, StartConfig };
