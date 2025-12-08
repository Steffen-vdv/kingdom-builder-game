export const Stat = {
	/** Maximum population capacity */
	populationMax: 'resource:core:max-population',
	/** Parent resource aggregating all population roles (auto-computed sum) */
	populationTotal: 'resource:core:total-population',
	armyStrength: 'resource:core:army-strength',
	fortificationStrength: 'resource:core:fortification-strength',
	absorption: 'resource:core:absorption',
	growth: 'resource:core:growth',
	warWeariness: 'resource:core:war-weariness',
} as const;

export type StatId = (typeof Stat)[keyof typeof Stat];
export type StatKey = StatId;

export function getStatResourceId(stat: StatKey): StatId {
	return stat;
}
