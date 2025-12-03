// Legacy exports for backwards compatibility
// These are being phased out in favor of RESOURCE_V2_REGISTRY

export const Stat = {
	maxPopulation: 'maxPopulation',
	armyStrength: 'armyStrength',
	fortificationStrength: 'fortificationStrength',
	absorption: 'absorption',
	growth: 'growth',
	warWeariness: 'warWeariness',
} as const;
export type StatKey = (typeof Stat)[keyof typeof Stat];

const STAT_V2_ID_BY_KEY = {
	[Stat.maxPopulation]: 'resource:stat:max-population',
	[Stat.armyStrength]: 'resource:stat:army-strength',
	[Stat.fortificationStrength]: 'resource:stat:fortification-strength',
	[Stat.absorption]: 'resource:stat:absorption',
	[Stat.growth]: 'resource:stat:growth',
	[Stat.warWeariness]: 'resource:stat:war-weariness',
} as const satisfies Record<StatKey, string>;

export type StatV2Id = (typeof STAT_V2_ID_BY_KEY)[StatKey];

export function getStatResourceV2Id(stat: StatKey): StatV2Id {
	return STAT_V2_ID_BY_KEY[stat];
}

// STATS export removed - use RESOURCE_V2_REGISTRY instead
