import type { PopulationRoleInfo } from './config/builders';
import { RESOURCE_V2_REGISTRY, type ResourceV2Definition } from './resourceV2';

export const PopulationRole = {
	Council: 'resource:population:role:council',
	Legion: 'resource:population:role:legion',
	Fortifier: 'resource:population:role:fortifier',
} as const;

export type PopulationRoleV2Id = (typeof PopulationRole)[keyof typeof PopulationRole];
export type PopulationRoleId = PopulationRoleV2Id;

const LEGACY_POPULATION_ROLE_KEY_MAP = {
	council: PopulationRole.Council,
	legion: PopulationRole.Legion,
	fortifier: PopulationRole.Fortifier,
} as const;

export function legacyPopulationRoleKeyToResourceV2Id(legacyKey: string): string {
	return LEGACY_POPULATION_ROLE_KEY_MAP[legacyKey as keyof typeof LEGACY_POPULATION_ROLE_KEY_MAP] ?? legacyKey;
}

const POPULATION_ROLE_KEY_BY_V2_ID = {
	[PopulationRole.Council]: PopulationRole.Council,
	[PopulationRole.Legion]: PopulationRole.Legion,
	[PopulationRole.Fortifier]: PopulationRole.Fortifier,
} as const satisfies Record<PopulationRoleId, PopulationRoleV2Id>;

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
