import type { PhaseDef, RuleSet, StartConfig } from '@kingdom-builder/protocol';

export type SyntheticAction = {
	id: string;
	name: string;
	icon: string;
};

export type CombatStatKey = 'power' | 'absorption' | 'fortification';

export type SyntheticDescriptor = {
	key: string;
	icon: string;
	label: string;
};

export const SYNTH_RESOURCE_IDS = {
	ap: 'ap',
	gold: 'gold',
	happiness: 'happiness',
	castleHP: 'castleHP',
	tier: 'tierResource',
} as const;

export type SyntheticResourceKey =
	(typeof SYNTH_RESOURCE_IDS)[keyof typeof SYNTH_RESOURCE_IDS];

export const SYNTH_RESOURCE_METADATA: Record<
	SyntheticResourceKey,
	SyntheticDescriptor
> = {
	[SYNTH_RESOURCE_IDS.ap]: {
		key: SYNTH_RESOURCE_IDS.ap,
		icon: '⚙️',
		label: 'Action Points',
	},
	[SYNTH_RESOURCE_IDS.gold]: {
		key: SYNTH_RESOURCE_IDS.gold,
		icon: '🪙',
		label: 'Gold',
	},
	[SYNTH_RESOURCE_IDS.happiness]: {
		key: SYNTH_RESOURCE_IDS.happiness,
		icon: '😊',
		label: 'Happiness',
	},
	[SYNTH_RESOURCE_IDS.castleHP]: {
		key: SYNTH_RESOURCE_IDS.castleHP,
		icon: '🏰',
		label: 'Castle HP',
	},
	[SYNTH_RESOURCE_IDS.tier]: {
		key: SYNTH_RESOURCE_IDS.tier,
		icon: '🎖️',
		label: 'Tier Resource',
	},
};

export const SYNTH_STAT_IDS = {
	armyStrength: 'armyStrength',
	absorption: 'absorption',
	fortificationStrength: 'fortificationStrength',
	warWeariness: 'warWeariness',
} as const;

export type SyntheticStatKey =
	(typeof SYNTH_STAT_IDS)[keyof typeof SYNTH_STAT_IDS];

export const SYNTH_STAT_METADATA: Record<
	SyntheticStatKey,
	SyntheticDescriptor
> = {
	[SYNTH_STAT_IDS.armyStrength]: {
		key: SYNTH_STAT_IDS.armyStrength,
		icon: '⚔️',
		label: 'Army Strength',
	},
	[SYNTH_STAT_IDS.absorption]: {
		key: SYNTH_STAT_IDS.absorption,
		icon: '🛡️',
		label: 'Absorption',
	},
	[SYNTH_STAT_IDS.fortificationStrength]: {
		key: SYNTH_STAT_IDS.fortificationStrength,
		icon: '🏯',
		label: 'Fortification',
	},
	[SYNTH_STAT_IDS.warWeariness]: {
		key: SYNTH_STAT_IDS.warWeariness,
		icon: '💤',
		label: 'War Weariness',
	},
};

export type CombatStatConfig = {
	key: string;
	icon: string;
	label: string;
	baseKey: SyntheticStatKey;
};

export const SYNTH_ATTACK: SyntheticAction = {
	id: 'synthetic:army_attack',
	name: 'Synthetic Assault',
	icon: '🛡️',
};

export const SYNTH_PLUNDER: SyntheticAction = {
	id: 'synthetic:plunder',
	name: 'Synthetic Plunder',
	icon: '💰',
};

export const SYNTH_BUILDING_ATTACK: SyntheticAction = {
	id: 'synthetic:building_attack',
	name: 'Raze Stronghold',
	icon: '🔥',
};

export const SYNTH_BUILDING = {
	id: 'synthetic:stronghold',
	name: 'Training Stronghold',
	icon: '🏯',
};

export const SYNTH_PARTIAL_ATTACK: SyntheticAction = {
	id: 'synthetic:partial_attack',
	name: 'Partial Assault',
	icon: '🗡️',
};

export const COMBAT_STAT_CONFIG: Record<CombatStatKey, CombatStatConfig> = {
	power: {
		key: 'synthetic:valor',
		icon: '⚔️',
		label: 'Valor',
		baseKey: SYNTH_STAT_IDS.armyStrength,
	},
	absorption: {
		key: 'synthetic:veil',
		icon: '🌫️',
		label: 'Veil',
		baseKey: SYNTH_STAT_IDS.absorption,
	},
	fortification: {
		key: 'synthetic:rampart',
		icon: '🧱',
		label: 'Rampart',
		baseKey: SYNTH_STAT_IDS.fortificationStrength,
	},
};

export const WAR_WEARINESS_GAIN = 4;
export const BUILDING_REWARD_GOLD = 6;
export const PLUNDER_PERCENT = 40;
export const PLUNDER_HAPPINESS_AMOUNT = 1;
export const TIER_RESOURCE_KEY = SYNTH_RESOURCE_IDS.tier;

export const PHASES: PhaseDef[] = [
	{
		id: 'phase:action',
		label: 'Action',
		icon: '🎲',
		steps: [{ id: 'phase:action:step', label: 'Resolve' }],
	},
];

export const START: StartConfig = {
	player: {
		resources: {
			[SYNTH_RESOURCE_IDS.ap]: 0,
			[SYNTH_RESOURCE_IDS.gold]: 0,
			[SYNTH_RESOURCE_IDS.happiness]: 0,
			[SYNTH_RESOURCE_IDS.castleHP]: 12,
		},
		stats: {
			[SYNTH_STAT_IDS.armyStrength]: 0,
			[SYNTH_STAT_IDS.absorption]: 0,
			[SYNTH_STAT_IDS.fortificationStrength]: 0,
			[SYNTH_STAT_IDS.warWeariness]: 0,
		},
		population: {},
		lands: [],
	},
};

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: TIER_RESOURCE_KEY,
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 1,
	winConditions: [],
};
