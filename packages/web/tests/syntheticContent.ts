/* eslint-disable max-lines */
import { Registry } from '@kingdom-builder/engine/registry';
import {
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type PopulationConfig,
	type StartConfig,
} from '@kingdom-builder/engine/config/schema';
import type { PhaseDef } from '@kingdom-builder/engine';
import type { RuleSet } from '@kingdom-builder/engine/services';
import type { ZodType } from 'zod';

type CostBag = NonNullable<ActionConfig['baseCosts']>;

declare const structuredClone: <T>(value: T) => T;

export const SYNTHETIC_IDS = {
	resources: {
		action: 'synthetic:resource:action',
		coin: 'synthetic:resource:coin',
		happiness: 'synthetic:resource:happiness',
	},
	stats: {
		maxPopulation: 'synthetic:stat:max-population',
		warWeariness: 'synthetic:stat:war-weariness',
	},
	actions: {
		expand: 'synthetic:action:expand-terrain',
		cultivate: 'synthetic:action:cultivate-land',
		harvest: 'synthetic:action:harvest-fields',
		levy: 'synthetic:action:levy-citizens',
	},
	buildings: {
		bazaar: 'synthetic:building:bazaar',
		watchtower: 'synthetic:building:watchtower',
		windmill: 'synthetic:building:windmill',
	},
	developments: {
		field: 'synthetic:development:field',
	},
	populationRoles: {
		council: 'synthetic:population:council',
		legion: 'synthetic:population:legion',
		fortifier: 'synthetic:population:fortifier',
		citizen: 'synthetic:population:citizen',
	},
	phases: {
		growth: 'synthetic:phase:growth',
		upkeep: 'synthetic:phase:upkeep',
		main: 'synthetic:phase:main',
	},
	steps: {
		income: 'synthetic:step:gain-income',
		upkeep: 'synthetic:step:pay-upkeep',
		main: 'synthetic:step:main',
	},
	triggers: {
		gainIncome: 'onGainIncomeStep',
		payUpkeep: 'onPayUpkeepStep',
	},
	passives: {
		harvestCost: 'synthetic:passive:harvest-cost',
	},
	costMods: {
		harvest: 'synthetic:cost-mod:harvest',
	},
	resultMods: {
		bazaar: 'synthetic:result-mod:bazaar',
	},
} as const;

export const Resource = {
	ap: SYNTHETIC_IDS.resources.action,
	coin: SYNTHETIC_IDS.resources.coin,
	happiness: SYNTHETIC_IDS.resources.happiness,
} as const;

export type ResourceKey = (typeof Resource)[keyof typeof Resource];

export const RESOURCES: Record<ResourceKey, { icon: string; label: string }> = {
	[Resource.ap]: { icon: '🅰️', label: 'Action Points' },
	[Resource.coin]: { icon: '🪙', label: 'Coins' },
	[Resource.happiness]: { icon: '😊', label: 'Joy' },
};

export const Stat = {
	maxPopulation: SYNTHETIC_IDS.stats.maxPopulation,
	warWeariness: SYNTHETIC_IDS.stats.warWeariness,
} as const;

export type StatKey = (typeof Stat)[keyof typeof Stat];

export const STATS: Record<StatKey, { icon: string; label: string }> = {
	[Stat.maxPopulation]: { icon: '📈', label: 'Max Population' },
	[Stat.warWeariness]: { icon: '🔥', label: 'War Weariness' },
};

export const PopulationRole = {
	Council: SYNTHETIC_IDS.populationRoles.council,
	Legion: SYNTHETIC_IDS.populationRoles.legion,
	Fortifier: SYNTHETIC_IDS.populationRoles.fortifier,
	Citizen: SYNTHETIC_IDS.populationRoles.citizen,
} as const;

export type PopulationRoleId =
	(typeof PopulationRole)[keyof typeof PopulationRole];

export const POPULATION_ROLES: Record<
	PopulationRoleId,
	{ icon: string; label: string }
> = {
	[PopulationRole.Council]: { icon: '🧠', label: 'Council' },
	[PopulationRole.Legion]: { icon: '⚔️', label: 'Legion' },
	[PopulationRole.Fortifier]: { icon: '🛡️', label: 'Fortifier' },
	[PopulationRole.Citizen]: { icon: '👥', label: 'Citizens' },
};

export const POPULATION_INFO = { icon: '👥', label: 'Population' } as const;
export const SLOT_INFO = { icon: '⬜', label: 'Development Slot' } as const;
export const LAND_INFO = { icon: '🗺️', label: 'Land' } as const;
export const PASSIVE_INFO = { icon: '♾️', label: 'Passive' } as const;
export const MODIFIER_INFO = {
	cost: { icon: '💲', label: 'Cost Modifier' },
	result: { icon: '🎁', label: 'Result Modifier' },
	evaluation: { icon: '🧮', label: 'Evaluation Modifier' },
};

const ACTION_CONFIGS: ActionConfig[] = [
	{
		id: SYNTHETIC_IDS.actions.expand,
		name: 'Expand Terrain',
		icon: '🌱',
		baseCosts: { [Resource.ap]: 1, [Resource.coin]: 1 } satisfies CostBag,
		effects: [
			{
				type: 'land',
				method: 'add',
				params: { count: 1 },
			},
			{
				type: 'resource',
				method: 'add',
				params: { key: Resource.happiness, amount: 1 },
			},
		],
	},
	{
		id: SYNTHETIC_IDS.actions.cultivate,
		name: 'Cultivate Land',
		icon: '🧑‍🌾',
		effects: [
			{
				type: 'land',
				method: 'till',
			},
		],
	},
	{
		id: SYNTHETIC_IDS.actions.harvest,
		name: 'Harvest Fields',
		icon: '🚜',
		baseCosts: { [Resource.ap]: 1, [Resource.coin]: 3 } satisfies CostBag,
		requirements: [
			{
				type: 'evaluator',
				method: 'compare',
				params: {
					left: { type: 'stat', params: { key: Stat.warWeariness } },
					operator: 'lt',
					right: {
						type: 'population',
						params: { role: PopulationRole.Legion },
					},
				},
			},
		],
		effects: [
			{
				type: 'action',
				method: 'perform',
				params: { id: SYNTHETIC_IDS.actions.expand },
			},
			{
				type: 'action',
				method: 'perform',
				params: { id: SYNTHETIC_IDS.actions.cultivate },
			},
			{
				type: 'passive',
				method: 'add',
				params: {
					id: SYNTHETIC_IDS.passives.harvestCost,
					name: 'Harvest Surcharge',
					icon: '♾️',
				},
				effects: [
					{
						type: 'cost_mod',
						method: 'add',
						params: {
							id: SYNTHETIC_IDS.costMods.harvest,
							key: Resource.coin,
							amount: 2,
						},
					},
				],
				onUpkeepPhase: [
					{
						type: 'passive',
						method: 'remove',
						params: { id: SYNTHETIC_IDS.passives.harvestCost },
					},
				],
			},
		],
	},
	{
		id: SYNTHETIC_IDS.actions.levy,
		name: 'Levy Citizens',
		icon: '💰',
		baseCosts: { [Resource.ap]: 1 } satisfies CostBag,
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: { key: Resource.coin, amount: 2 },
				meta: {
					source: {
						type: 'population',
						id: PopulationRole.Citizen,
						count: 2,
					},
				},
			},
		],
	},
];

const BUILDING_CONFIGS: BuildingConfig[] = [
	{
		id: SYNTHETIC_IDS.buildings.bazaar,
		name: 'Bazaar',
		icon: '🏬',
		costs: { [Resource.coin]: 6 },
		onBuild: [
			{
				type: 'result_mod',
				method: 'add',
				params: {
					id: SYNTHETIC_IDS.resultMods.bazaar,
					actionId: SYNTHETIC_IDS.actions.levy,
				},
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: { key: Resource.coin, amount: 1 },
						meta: {
							source: {
								type: 'building',
								id: SYNTHETIC_IDS.buildings.bazaar,
							},
						},
					},
				],
			},
		],
	},
	{
		id: SYNTHETIC_IDS.buildings.watchtower,
		name: 'Watchtower',
		icon: '🗼',
		costs: { [Resource.coin]: 4 },
		onPayUpkeepStep: [
			{
				type: 'resource',
				method: 'remove',
				params: { key: Resource.coin, amount: 1 },
				meta: {
					source: {
						type: 'building',
						id: SYNTHETIC_IDS.buildings.watchtower,
					},
				},
			},
		],
	},
	{
		id: SYNTHETIC_IDS.buildings.windmill,
		name: 'Windmill',
		icon: '🌬️',
		costs: { [Resource.coin]: 5 },
		onGainIncomeStep: [
			{
				type: 'resource',
				method: 'add',
				params: { key: Resource.coin, amount: 1 },
				meta: {
					source: {
						type: 'building',
						id: SYNTHETIC_IDS.buildings.windmill,
					},
				},
			},
		],
	},
];

const DEVELOPMENT_CONFIGS: DevelopmentConfig[] = [
	{
		id: SYNTHETIC_IDS.developments.field,
		name: 'Field',
		icon: '🌾',
		onGainIncomeStep: [
			{
				type: 'resource',
				method: 'add',
				params: { key: Resource.coin, amount: 2 },
				meta: {
					source: {
						type: 'development',
						id: SYNTHETIC_IDS.developments.field,
					},
				},
			},
		],
	},
];

const POPULATION_CONFIGS: PopulationConfig[] = [
	{
		id: PopulationRole.Council,
		name: 'Council',
		icon: POPULATION_ROLES[PopulationRole.Council].icon,
	},
	{
		id: PopulationRole.Legion,
		name: 'Legion',
		icon: POPULATION_ROLES[PopulationRole.Legion].icon,
	},
	{
		id: PopulationRole.Fortifier,
		name: 'Fortifier',
		icon: POPULATION_ROLES[PopulationRole.Fortifier].icon,
	},
	{
		id: PopulationRole.Citizen,
		name: 'Citizens',
		icon: POPULATION_ROLES[PopulationRole.Citizen].icon,
		upkeep: { [Resource.coin]: 1 },
	},
];

function buildRegistry<T>(
	schema: ZodType<T>,
	configs: Array<T & { id: string }>,
) {
	const registry = new Registry<T>(schema);
	for (const config of configs) registry.add(config.id, config);
	return registry;
}

export const ACTIONS = buildRegistry<ActionConfig>(
	actionSchema,
	ACTION_CONFIGS,
);
export const BUILDINGS = buildRegistry<BuildingConfig>(
	buildingSchema,
	BUILDING_CONFIGS,
);
export const DEVELOPMENTS = buildRegistry<DevelopmentConfig>(
	developmentSchema,
	DEVELOPMENT_CONFIGS,
);
export const POPULATIONS = buildRegistry<PopulationConfig>(
	populationSchema,
	POPULATION_CONFIGS,
);

export const PHASES: PhaseDef[] = [
	{
		id: SYNTHETIC_IDS.phases.growth,
		label: 'Growth',
		icon: '🌿',
		steps: [
			{
				id: SYNTHETIC_IDS.steps.income,
				title: 'Gain Income',
				icon: '💰',
				triggers: [SYNTHETIC_IDS.triggers.gainIncome],
			},
		],
	},
	{
		id: SYNTHETIC_IDS.phases.upkeep,
		label: 'Upkeep',
		icon: '🧹',
		steps: [
			{
				id: SYNTHETIC_IDS.steps.upkeep,
				title: 'Pay Upkeep',
				icon: '🧾',
				triggers: [SYNTHETIC_IDS.triggers.payUpkeep],
			},
		],
	},
	{
		id: SYNTHETIC_IDS.phases.main,
		label: 'Main',
		icon: '🎯',
		action: true,
		steps: [
			{
				id: SYNTHETIC_IDS.steps.main,
				title: 'Main Phase',
			},
		],
	},
];

export const TRIGGER_INFO: Record<
	string,
	{ icon?: string; future?: string; past?: string }
> = {
	onBuild: { icon: '⚒️', future: 'Until removed', past: 'Build' },
	[SYNTHETIC_IDS.triggers.gainIncome]: {
		icon: '💰',
		future: 'During income step',
		past: 'Income step',
	},
	[SYNTHETIC_IDS.triggers.payUpkeep]: {
		icon: '🧾',
		future: 'During upkeep step',
		past: 'Upkeep step',
	},
	onGainAPStep: { icon: '⚡', future: 'During AP step', past: 'AP step' },
	mainPhase: {
		icon: PHASES.find((p) => p.id === SYNTHETIC_IDS.phases.main)?.icon || '🎯',
		future: '',
		past: `${
			PHASES.find((p) => p.id === SYNTHETIC_IDS.phases.main)?.label || 'Main'
		} phase`,
	},
	...Object.fromEntries(
		PHASES.map((phase) => [
			`on${phase.id.charAt(0).toUpperCase() + phase.id.slice(1)}Phase`,
			{
				icon: phase.icon,
				future: `On each ${phase.label} Phase`,
				past: `${phase.label} Phase`,
			},
		]),
	),
};

export const GAME_START: StartConfig = {
	player: {
		resources: {
			[Resource.ap]: 3,
			[Resource.coin]: 5,
			[Resource.happiness]: 0,
		},
		stats: {
			[Stat.maxPopulation]: 2,
			[Stat.warWeariness]: 1,
		},
		population: {
			[PopulationRole.Council]: 1,
			[PopulationRole.Legion]: 0,
			[PopulationRole.Fortifier]: 0,
			[PopulationRole.Citizen]: 2,
		},
		lands: [
			{
				slotsMax: 1,
				slotsUsed: 1,
				developments: [SYNTHETIC_IDS.developments.field],
			},
		],
	},
};

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: Resource.happiness,
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 2,
};

export const ON_GAIN_INCOME_STEP = SYNTHETIC_IDS.triggers.gainIncome;
export const ON_PAY_UPKEEP_STEP = SYNTHETIC_IDS.triggers.payUpkeep;

export const syntheticModule = {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCES,
	Resource,
	STATS,
	Stat,
	POPULATION_ROLES,
	PopulationRole,
	POPULATION_INFO,
	SLOT_INFO,
	LAND_INFO,
	PASSIVE_INFO,
	MODIFIER_INFO,
	TRIGGER_INFO,
	ON_GAIN_INCOME_STEP,
	ON_PAY_UPKEEP_STEP,
};

export function cloneStart(): StartConfig {
	return structuredClone(GAME_START);
}
