import type { ResourceInfo } from './config/builders';
import { RESOURCE_V2_REGISTRY, type ResourceV2Definition } from './resourceV2';

export const Resource = {
	gold: 'gold',
	ap: 'ap',
	happiness: 'happiness',
	castleHP: 'castleHP',
} as const;
export type ResourceKey = (typeof Resource)[keyof typeof Resource];

const RESOURCE_V2_ID_BY_KEY = {
	[Resource.gold]: 'resource:core:gold',
	[Resource.ap]: 'resource:core:action-points',
	[Resource.happiness]: 'resource:core:happiness',
	[Resource.castleHP]: 'resource:core:castle-hp',
} as const satisfies Record<ResourceKey, string>;

export type ResourceV2Id = (typeof RESOURCE_V2_ID_BY_KEY)[ResourceKey];

export function getResourceV2Id(resource: ResourceKey): ResourceV2Id {
	return RESOURCE_V2_ID_BY_KEY[resource];
}

const RESOURCE_KEY_BY_V2_ID = Object.fromEntries(Object.entries(RESOURCE_V2_ID_BY_KEY).map(([key, id]) => [id, key as ResourceKey])) as Record<ResourceV2Id, ResourceKey>;

function toLegacyResourceInfo(key: ResourceKey, definition: ResourceV2Definition): ResourceInfo {
	const info: ResourceInfo = {
		key,
		icon: definition.icon,
		label: definition.label,
		description: definition.description ?? '',
	};
	if (definition.tags?.length) {
		info.tags = [...definition.tags];
	}
	return info;
}

const resourceEntries: [ResourceKey, ResourceInfo][] = [];

for (const definition of RESOURCE_V2_REGISTRY.ordered) {
	const key = RESOURCE_KEY_BY_V2_ID[definition.id as ResourceV2Id];
	if (!key) {
		continue;
	}
	resourceEntries.push([key, toLegacyResourceInfo(key, definition)]);
}

export const RESOURCES = Object.fromEntries(resourceEntries) as Record<ResourceKey, ResourceInfo>;
