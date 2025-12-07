export const Stat = {
	/** Maximum population capacity */
	populationMax: 'resource:core:max-population',
	/** Parent resource aggregating all population roles (auto-computed sum) */
	populationTotal: 'resource:core:total',
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
