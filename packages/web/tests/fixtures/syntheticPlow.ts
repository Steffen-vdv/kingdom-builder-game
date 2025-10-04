import { vi } from 'vitest';
import {
	createContentFactory,
	type ContentFactory,
} from '../../../engine/tests/factories/content';
import type { PhaseDef } from '@kingdom-builder/engine/phases';
import type {
	StartConfig,
	ActionConfig,
	BuildingConfig,
	EffectDef,
} from '@kingdom-builder/protocol';
import type { RuleSet } from '@kingdom-builder/engine/services';

type SyntheticResourceKey = 'gold' | 'ap' | 'happiness';

type SyntheticResourceInfo = { icon: string; label: string };

const syntheticData = vi.hoisted(() => ({
	RESOURCES: {
		gold: { icon: '🪙', label: 'Synthetic Gold' },
		ap: { icon: '🛠️', label: 'Synthetic Action Points' },
		happiness: { icon: '🙂', label: 'Synthetic Happiness' },
	} satisfies Record<SyntheticResourceKey, SyntheticResourceInfo>,
	LAND_INFO: { icon: '🗺️', label: 'Synthetic Land' } as const,
	SLOT_INFO: { icon: '🧱', label: 'Synthetic Slot' } as const,
	PASSIVE_INFO: { icon: '♻️', label: 'Synthetic Passive' } as const,
	UPKEEP_PHASE: {
		id: 'phase:synthetic:upkeep',
		label: 'Synthetic Upkeep',
		icon: '🧭',
		steps: [{ id: 'phase:synthetic:upkeep:step' }],
	} satisfies PhaseDef,
}));

export const SYNTHETIC_RESOURCES = syntheticData.RESOURCES;
export const SYNTHETIC_LAND_INFO = syntheticData.LAND_INFO;
export const SYNTHETIC_SLOT_INFO = syntheticData.SLOT_INFO;
export const SYNTHETIC_PASSIVE_INFO = syntheticData.PASSIVE_INFO;
export const SYNTHETIC_UPKEEP_PHASE: PhaseDef = syntheticData.UPKEEP_PHASE;

vi.mock('@kingdom-builder/contents', async () => {
	const actual = (await vi.importActual('@kingdom-builder/contents')) as Record<
		string,
		unknown
	>;
	const module = actual as unknown as {
		RESOURCES: Record<string, { icon?: string; label?: string }>;
		LAND_INFO: { icon: string; label: string };
		SLOT_INFO: { icon: string; label: string };
		PASSIVE_INFO: { icon: string; label: string };
		[key: string]: unknown;
	};
	return {
		...module,
		RESOURCES: {
			...module.RESOURCES,
			gold: syntheticData.RESOURCES.gold,
			ap: syntheticData.RESOURCES.ap,
			happiness: syntheticData.RESOURCES.happiness,
		},
		LAND_INFO: syntheticData.LAND_INFO,
		SLOT_INFO: syntheticData.SLOT_INFO,
		PASSIVE_INFO: syntheticData.PASSIVE_INFO,
	};
});

export interface SyntheticPlowContent {
	factory: ContentFactory;
	expand: ActionConfig;
	till: ActionConfig;
	plow: ActionConfig;
	plowPassive: EffectDef['params'];
	building: BuildingConfig;
	phases: PhaseDef[];
	start: StartConfig;
	rules: RuleSet;
	tierResourceKey: string;
}

export function createSyntheticPlowContent(): SyntheticPlowContent {
	const factory = createContentFactory();
	const tierResourceKey = 'resource:synthetic:tier';
	const expand = factory.action({
		id: 'action:synthetic:expand',
		name: 'Expand Fields',
		icon: '🌾',
		system: true,
		baseCosts: { ap: 1, gold: 2 },
		effects: [
			{ type: 'land', method: 'add', params: { count: 1 } },
			{
				type: 'resource',
				method: 'add',
				params: { key: 'happiness', amount: 1 },
			},
		],
	});
	const till = factory.action({
		id: 'action:synthetic:till',
		name: 'Till Soil',
		icon: '🧑\u200d🌾',
		system: true,
		effects: [{ type: 'land', method: 'till' }],
	});
	const plowPassiveParams = {
		id: 'passive:synthetic:furrows',
		name: 'Furrow Focus',
		icon: '🌱',
		durationPhaseId: SYNTHETIC_UPKEEP_PHASE.id,
	} satisfies EffectDef['params'];
	const plow = factory.action({
		id: 'action:synthetic:plow',
		name: 'Plow Furrows',
		icon: '🚜',
		system: true,
		baseCosts: { ap: 1, gold: 6 },
		effects: [
			{ type: 'action', method: 'perform', params: { id: expand.id } },
			{ type: 'action', method: 'perform', params: { id: till.id } },
			{
				type: 'passive',
				method: 'add',
				params: plowPassiveParams,
				effects: [
					{
						type: 'cost_mod',
						method: 'add',
						params: {
							id: 'cost-mod:synthetic:plow',
							key: 'gold',
							amount: 2,
						},
					},
				],
			},
		],
	});
	const building = factory.building({
		id: 'building:synthetic:plow-workshop',
		name: 'Synthetic Plow Workshop',
		icon: '🏗️',
		onBuild: [
			{
				type: 'action',
				method: 'add',
				params: { id: plow.id },
			},
		],
	});
	const phases = [SYNTHETIC_UPKEEP_PHASE];
	const start: StartConfig = {
		player: {
			resources: {
				gold: 0,
				ap: 0,
				happiness: 0,
				[tierResourceKey]: 0,
			},
			stats: {},
			population: {},
			lands: [
				{
					id: 'land:synthetic:home',
					developments: [],
					slotsMax: 1,
					slotsUsed: 0,
					tilled: false,
				},
			],
		},
	};
	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down',
		tieredResourceKey: tierResourceKey,
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 2,
		basePopulationCap: 1,
	};
	return {
		factory,
		expand,
		till,
		plow,
		plowPassive: plowPassiveParams,
		building,
		phases,
		start,
		rules,
		tierResourceKey,
	};
}
