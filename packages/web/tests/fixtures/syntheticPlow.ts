import {
	createContentFactory,
	createResourceV2Registries,
	resourceV2Definition,
	resourceV2GroupDefinition,
	type ContentFactory,
} from '@kingdom-builder/testing';
import type {
	PhaseDef,
	RuleSet,
	StartConfig,
	ActionConfig,
	BuildingConfig,
	EffectDef,
	SessionResourceCatalogV2,
} from '@kingdom-builder/protocol';

// V2 resource key constants
export const SYNTHETIC_RESOURCE_V2_KEYS = {
	gold: 'resource:synthetic:gold',
	ap: 'resource:synthetic:ap',
	happiness: 'resource:synthetic:happiness',
} as const;

type SyntheticResourceKey = 'gold' | 'ap' | 'happiness';

type SyntheticResourceInfo = { icon: string; label: string };

const syntheticData = {
	RESOURCES: {
		gold: { icon: '🪙', label: 'Synthetic Gold' },
		ap: { icon: '🛠️', label: 'Synthetic Action Points' },
		happiness: { icon: '🙂', label: 'Synthetic Happiness' },
	} satisfies Record<SyntheticResourceKey, SyntheticResourceInfo>,
	// V2 keyed resources for use in assets/context
	RESOURCES_V2: {
		[SYNTHETIC_RESOURCE_V2_KEYS.gold]: { icon: '🪙', label: 'Synthetic Gold' },
		[SYNTHETIC_RESOURCE_V2_KEYS.ap]: {
			icon: '🛠️',
			label: 'Synthetic Action Points',
		},
		[SYNTHETIC_RESOURCE_V2_KEYS.happiness]: {
			icon: '🙂',
			label: 'Synthetic Happiness',
		},
	} as Record<string, SyntheticResourceInfo>,
	LAND_INFO: { icon: '🗺️', label: 'Synthetic Land' } as const,
	SLOT_INFO: { icon: '🧱', label: 'Synthetic Slot' } as const,
	PASSIVE_INFO: { icon: '♻️', label: 'Synthetic Passive' } as const,
	UPKEEP_PHASE: {
		id: 'phase:synthetic:upkeep',
		label: 'Synthetic Upkeep',
		icon: '🧭',
		steps: [{ id: 'phase:synthetic:upkeep:step' }],
	} satisfies PhaseDef,
} as const;

export const SYNTHETIC_RESOURCES = syntheticData.RESOURCES;
export const SYNTHETIC_RESOURCES_V2 = syntheticData.RESOURCES_V2;
export const SYNTHETIC_LAND_INFO = syntheticData.LAND_INFO;
export const SYNTHETIC_SLOT_INFO = syntheticData.SLOT_INFO;
export const SYNTHETIC_PASSIVE_INFO = syntheticData.PASSIVE_INFO;
export const SYNTHETIC_UPKEEP_PHASE: PhaseDef = syntheticData.UPKEEP_PHASE;

/**
 * No-op system action IDs used to skip initial setup.
 * These actions don't exist, so no setup effects run.
 */
export const SKIP_SETUP_ACTION_IDS = {
	initialSetup: '__synth_plow_noop_initial__',
	initialSetupDevmode: '__synth_plow_noop_devmode__',
	compensation: '__synth_plow_noop_compensation__',
	compensationDevmodeB: '__synth_plow_noop_compensation_b__',
};

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

	// Apply resources (old format) as resource:add effects
	if (startConfig.player.resources) {
		for (const [resourceId, value] of Object.entries(
			startConfig.player.resources,
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

export function registerSyntheticPlowResources(
	target: Record<string, { key: string; icon?: string; label?: string }>,
): void {
	for (const [key, info] of Object.entries(SYNTHETIC_RESOURCES)) {
		target[key] = {
			key,
			icon: info.icon,
			label: info.label,
		};
	}
}

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
	resourceCatalogV2: SessionResourceCatalogV2;
}

export function createSyntheticPlowContent(): SyntheticPlowContent {
	const factory = createContentFactory();
	const tierResourceKey = 'resource:synthetic:tier';
	const expand = factory.action({
		id: 'action:synthetic:expand',
		name: 'Expand Fields',
		icon: '🌾',
		system: true,
		baseCosts: {
			[SYNTHETIC_RESOURCE_V2_KEYS.ap]: 1,
			[SYNTHETIC_RESOURCE_V2_KEYS.gold]: 2,
		},
		effects: [
			{ type: 'land', method: 'add', params: { count: 1 } },
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: SYNTHETIC_RESOURCE_V2_KEYS.happiness,
					change: { type: 'amount', amount: 1 },
				},
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
		baseCosts: {
			[SYNTHETIC_RESOURCE_V2_KEYS.ap]: 1,
			[SYNTHETIC_RESOURCE_V2_KEYS.gold]: 6,
		},
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
							key: SYNTHETIC_RESOURCE_V2_KEYS.gold,
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
				[SYNTHETIC_RESOURCE_V2_KEYS.gold]: 0,
				[SYNTHETIC_RESOURCE_V2_KEYS.ap]: 0,
				[SYNTHETIC_RESOURCE_V2_KEYS.happiness]: 0,
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
		winConditions: [],
	};

	// Create ResourceV2 catalog for synthetic plow resources
	const coreGroup = resourceV2GroupDefinition({
		id: 'resource-group:synthetic:core',
		order: 0,
	});
	const resourceDefinitions = [
		resourceV2Definition({
			id: 'resource:synthetic:gold',
			metadata: {
				label: SYNTHETIC_RESOURCES.gold.label,
				icon: SYNTHETIC_RESOURCES.gold.icon,
				group: { id: coreGroup.id, order: 0 },
			},
			bounds: { lowerBound: 0 },
		}),
		resourceV2Definition({
			id: 'resource:synthetic:ap',
			metadata: {
				label: SYNTHETIC_RESOURCES.ap.label,
				icon: SYNTHETIC_RESOURCES.ap.icon,
				group: { id: coreGroup.id, order: 1 },
			},
			bounds: { lowerBound: 0 },
			globalCost: 1,
		}),
		resourceV2Definition({
			id: 'resource:synthetic:happiness',
			metadata: {
				label: SYNTHETIC_RESOURCES.happiness.label,
				icon: SYNTHETIC_RESOURCES.happiness.icon,
				group: { id: coreGroup.id, order: 2 },
			},
			bounds: { lowerBound: 0 },
		}),
		resourceV2Definition({
			id: tierResourceKey,
			metadata: {
				label: 'Synthetic Tier',
				icon: '🎚️',
				group: { id: coreGroup.id, order: 3 },
			},
		}),
	];
	const resourceCatalogV2 = createResourceV2Registries({
		resources: resourceDefinitions,
		groups: [coreGroup],
	});

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
		resourceCatalogV2,
	};
}
