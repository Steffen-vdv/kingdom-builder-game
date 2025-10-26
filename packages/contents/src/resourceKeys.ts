export const Resource = {
	gold: 'gold',
	ap: 'ap',
	happiness: 'happiness',
	castleHP: 'castleHP',
} as const;

export type ResourceKey = (typeof Resource)[keyof typeof Resource];

export const RESOURCE_V2_ID_BY_KEY = {
	[Resource.gold]: 'resource:core:gold',
	[Resource.ap]: 'resource:core:action-points',
	[Resource.happiness]: 'resource:core:happiness',
	[Resource.castleHP]: 'resource:core:castle-hp',
} as const satisfies Record<ResourceKey, string>;

export type ResourceV2Id = (typeof RESOURCE_V2_ID_BY_KEY)[ResourceKey];

export function getResourceV2Id(resource: ResourceKey): ResourceV2Id {
	return RESOURCE_V2_ID_BY_KEY[resource];
}

export const RESOURCE_KEY_BY_V2_ID = Object.fromEntries(Object.entries(RESOURCE_V2_ID_BY_KEY).map(([key, id]) => [id, key as ResourceKey])) as Record<ResourceV2Id, ResourceKey>;
