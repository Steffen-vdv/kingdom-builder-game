export const Stat = {
	maxPopulation: 'resource:core:max-population',
	armyStrength: 'resource:core:army-strength',
	fortificationStrength: 'resource:core:fortification-strength',
	absorption: 'resource:core:absorption',
	growth: 'resource:core:growth',
	warWeariness: 'resource:core:war-weariness',
} as const;

export type StatV2Id = (typeof Stat)[keyof typeof Stat];
export type StatKey = StatV2Id;

export function getStatResourceV2Id(stat: StatKey): StatV2Id {
	return stat;
}

const LEGACY_STAT_KEY_MAP = {
	maxPopulation: Stat.maxPopulation,
	armyStrength: Stat.armyStrength,
	fortificationStrength: Stat.fortificationStrength,
	absorption: Stat.absorption,
	growth: Stat.growth,
	warWeariness: Stat.warWeariness,
} as const;

export function legacyStatKeyToResourceV2Id(legacyKey: string): string {
	return LEGACY_STAT_KEY_MAP[legacyKey as keyof typeof LEGACY_STAT_KEY_MAP] ?? legacyKey;
}
