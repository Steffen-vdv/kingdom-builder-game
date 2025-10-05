import {
	Resource as ContentResource,
	Stat as ContentStat,
} from '@kingdom-builder/contents';
import type { PhaseDef } from '@kingdom-builder/engine/phases';
import type { StartConfig } from '@kingdom-builder/protocol';
import type { RuleSet } from '@kingdom-builder/engine/services';
import { Stat } from '@kingdom-builder/engine';

type SyntheticAction = {
	id: string;
	name: string;
	icon: string;
};

type CombatStatKey = 'power' | 'absorption' | 'fortification';

type CombatStatConfig = {
	key: string;
	icon: string;
	label: string;
	base: Stat;
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
		base: Stat.armyStrength,
	},
	absorption: {
		key: 'synthetic:veil',
		icon: '🌫️',
		label: 'Veil',
		base: Stat.absorption,
	},
	fortification: {
		key: 'synthetic:rampart',
		icon: '🧱',
		label: 'Rampart',
		base: Stat.fortificationStrength,
	},
};

export const ATTACKER_HAPPINESS_GAIN = 2;
export const DEFENDER_HAPPINESS_LOSS = 3;
export const WAR_WEARINESS_GAIN = 4;
export const BUILDING_REWARD_GOLD = 6;
export const PLUNDER_PERCENT = 40;
export const TIER_RESOURCE_KEY = 'synthetic:tier';

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
			[ContentResource.ap]: 0,
			[ContentResource.gold]: 0,
			[ContentResource.happiness]: 0,
			[ContentResource.castleHP]: 12,
		},
		stats: {
			[ContentStat.armyStrength]: 0,
			[ContentStat.absorption]: 0,
			[ContentStat.fortificationStrength]: 0,
			[ContentStat.warWeariness]: 0,
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
};

export type { SyntheticAction, CombatStatKey, CombatStatConfig };
