export const Resource = {
	gold: 'resource:core:gold',
	ap: 'resource:core:action-points',
	happiness: 'resource:core:happiness',
	castleHP: 'resource:core:castle-hp',
} as const;

export type ResourceV2Id = (typeof Resource)[keyof typeof Resource];
export type ResourceKey = ResourceV2Id;

export function getResourceV2Id(resource: ResourceV2Id): ResourceV2Id {
	return resource;
}

const LEGACY_KEY_MAP = {
	gold: Resource.gold,
	ap: Resource.ap,
	happiness: Resource.happiness,
	castleHP: Resource.castleHP,
} as const;

export function legacyKeyToResourceV2Id(legacyKey: string): string {
	return LEGACY_KEY_MAP[legacyKey as keyof typeof LEGACY_KEY_MAP] ?? legacyKey;
}
