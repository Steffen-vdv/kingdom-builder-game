import { vi } from 'vitest';
import { PhaseId, PhaseStepId } from '@kingdom-builder/contents';
import type { RuleSet } from '@kingdom-builder/engine/services';
import type { PhaseDef } from '@kingdom-builder/engine/phases';
import type { StartConfig } from '@kingdom-builder/protocol';

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
	phaseIds: Record<PhaseId, string>;
	stepIds: Record<'gainIncome' | 'payUpkeep', string>;
};

const syntheticData = vi.hoisted<SyntheticContent>(() => ({
	resourceKeys: {
		coin: 'resource:synthetic:coin',
		actionPoints: 'resource:synthetic:ap',
	},
	resources: {
		'resource:synthetic:coin': { icon: '🪙', label: 'Synthetic Coin' },
		'resource:synthetic:ap': { icon: '🛠️', label: 'Synthetic Action Points' },
	},
	populationRoleId: 'population:synthetic:citizen',
	populationInfo: { icon: '👥', label: 'Synthetic Population' },
	populationRoles: {
		'population:synthetic:citizen': { icon: '🧑‍🌾', label: 'Synthetic Citizen' },
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
		payUpkeep: 'step:synthetic:pay-upkeep',
	},
}));

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
export const SYNTHETIC_PHASE_IDS: Record<PhaseId, string> = {
	[PhaseId.Growth]: syntheticData.phaseIds.growth,
	[PhaseId.Main]: syntheticData.phaseIds.main,
	[PhaseId.Upkeep]: syntheticData.phaseIds.upkeep,
};
type SyntheticStepKey =
	| typeof PhaseStepId.GainIncome
	| typeof PhaseStepId.PayUpkeep;

export const SYNTHETIC_STEP_IDS: Record<SyntheticStepKey, string> = {
	[PhaseStepId.GainIncome]: syntheticData.stepIds.gainIncome,
	[PhaseStepId.PayUpkeep]: syntheticData.stepIds.payUpkeep,
};

export const SYNTHETIC_RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: SYNTHETIC_RESOURCE_KEYS.coin,
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 2,
};

vi.mock('@kingdom-builder/contents', async () => {
	const actual = (await vi.importActual('@kingdom-builder/contents')) as Record<
		string,
		unknown
	> & {
		RESOURCES?: Record<string, { icon?: string; label?: string }>;
		POPULATION_INFO?: { icon?: string; label?: string };
		POPULATION_ROLES?: Record<string, { icon?: string; label?: string }>;
		LAND_INFO?: { icon?: string; label?: string };
		SLOT_INFO?: { icon?: string; label?: string };
	};

	const { resources, populationInfo, populationRoles, landInfo, slotInfo } =
		syntheticData;

	return {
		...actual,
		RESOURCES: { ...(actual.RESOURCES ?? {}), ...resources },
		POPULATION_INFO: { ...(actual.POPULATION_INFO ?? {}), ...populationInfo },
		POPULATION_ROLES: {
			...(actual.POPULATION_ROLES ?? {}),
			...populationRoles,
		},
		LAND_INFO: { ...(actual.LAND_INFO ?? {}), ...landInfo },
		SLOT_INFO: { ...(actual.SLOT_INFO ?? {}), ...slotInfo },
	};
});

export type { PhaseDef, StartConfig };
