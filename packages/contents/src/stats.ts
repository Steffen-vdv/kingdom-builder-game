import type { StatInfo } from './config/builders';
import { RESOURCE_V2_REGISTRY, type ResourceV2Definition } from './resourceV2';
import { STAT_RESOURCE_V2_IDS, type StatResourceV2Id } from './config/statResourceIds';

export { resolveStatResourceV2Id } from './config/statResourceIds';

export const Stat = {
	maxPopulation: 'maxPopulation',
	armyStrength: 'armyStrength',
	fortificationStrength: 'fortificationStrength',
	absorption: 'absorption',
	growth: 'growth',
	warWeariness: 'warWeariness',
} as const;
export type StatKey = (typeof Stat)[keyof typeof Stat];

const STAT_V2_ID_BY_KEY = STAT_RESOURCE_V2_IDS as Record<StatKey, StatResourceV2Id>;

type StatV2Id = StatResourceV2Id;

const STAT_KEY_BY_V2_ID = Object.fromEntries(Object.entries(STAT_V2_ID_BY_KEY).map(([key, id]) => [id, key as StatKey])) as Record<StatV2Id, StatKey>;

const STAT_OVERRIDES: Partial<Record<StatKey, Pick<StatInfo, 'addFormat' | 'capacity'>>> = {
	[Stat.maxPopulation]: {
		capacity: true,
		addFormat: { prefix: 'Max ' },
	},
	[Stat.absorption]: {
		addFormat: { percent: true },
	},
	[Stat.growth]: {
		addFormat: { percent: true },
	},
};

function toLegacyStatInfo(key: StatKey, definition: ResourceV2Definition): StatInfo {
	const info: StatInfo = {
		key,
		icon: definition.icon,
		label: definition.label,
		description: definition.description ?? '',
	};
	if (definition.displayAsPercent) {
		info.displayAsPercent = true;
	}
	const overrides = STAT_OVERRIDES[key];
	if (overrides?.capacity) {
		info.capacity = overrides.capacity;
	}
	if (overrides?.addFormat) {
		info.addFormat = overrides.addFormat;
	}
	return info;
}

const statEntries: [StatKey, StatInfo][] = [];

for (const definition of RESOURCE_V2_REGISTRY.ordered) {
	const key = STAT_KEY_BY_V2_ID[definition.id as StatV2Id];
	if (!key) {
		continue;
	}
	statEntries.push([key, toLegacyStatInfo(key, definition)]);
}

export const STATS = Object.fromEntries(statEntries) as Record<StatKey, StatInfo>;
