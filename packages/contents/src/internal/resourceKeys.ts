export const Resource = {
	gold: 'resource:core:gold',
	ap: 'resource:core:action-points',
	happiness: 'resource:core:happiness',
	castleHP: 'resource:core:castle-hp',
} as const;

export type ResourceId = (typeof Resource)[keyof typeof Resource];
export type ResourceKey = ResourceId;

export function getResourceId(resource: ResourceId): ResourceId {
	return resource;
}
