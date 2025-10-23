export const STAT_RESOURCE_V2_IDS = {
	maxPopulation: 'resource:stat:max-population',
	armyStrength: 'resource:stat:army-strength',
	fortificationStrength: 'resource:stat:fortification-strength',
	absorption: 'resource:stat:absorption',
	growth: 'resource:stat:growth',
	warWeariness: 'resource:stat:war-weariness',
} as const;

export type StatResourceKey = keyof typeof STAT_RESOURCE_V2_IDS;
export type StatResourceV2Id = (typeof STAT_RESOURCE_V2_IDS)[StatResourceKey];

export function resolveStatResourceV2Id(stat: StatResourceKey): StatResourceV2Id {
	return STAT_RESOURCE_V2_IDS[stat];
}
