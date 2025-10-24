import type { PopulationRoleInfo } from './config/builders';
import { RESOURCE_V2_REGISTRY, type ResourceV2Definition } from './resourceV2';

export const PopulationRole = {
	Council: 'council',
	Legion: 'legion',
	Fortifier: 'fortifier',
} as const;
export type PopulationRoleId = (typeof PopulationRole)[keyof typeof PopulationRole];

const POPULATION_ROLE_V2_ID_BY_KEY = {
	[PopulationRole.Council]: 'resource:population:role:council',
	[PopulationRole.Legion]: 'resource:population:role:legion',
	[PopulationRole.Fortifier]: 'resource:population:role:fortifier',
} as const satisfies Record<PopulationRoleId, string>;

type PopulationRoleV2Id = (typeof POPULATION_ROLE_V2_ID_BY_KEY)[PopulationRoleId];

const POPULATION_ROLE_KEY_BY_V2_ID = Object.fromEntries(Object.entries(POPULATION_ROLE_V2_ID_BY_KEY).map(([key, id]) => [id, key as PopulationRoleId])) as Record<PopulationRoleV2Id, PopulationRoleId>;

function toLegacyPopulationRoleInfo(key: PopulationRoleId, definition: ResourceV2Definition): PopulationRoleInfo {
	return {
		key,
		icon: definition.icon,
		label: definition.label,
		description: definition.description ?? '',
	};
}

const populationRoleEntries: [PopulationRoleId, PopulationRoleInfo][] = [];

for (const definition of RESOURCE_V2_REGISTRY.ordered) {
	const key = POPULATION_ROLE_KEY_BY_V2_ID[definition.id as PopulationRoleV2Id];
	if (!key) {
		continue;
	}
	populationRoleEntries.push([key, toLegacyPopulationRoleInfo(key, definition)]);
}

export const POPULATION_ROLES = Object.fromEntries(populationRoleEntries) as Record<PopulationRoleId, PopulationRoleInfo>;
