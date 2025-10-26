import type { ResourceInfo } from './config/builders/domain/infoBuilders';
import type { ResourceV2Definition } from './resourceV2';
import { RESOURCE_V2_REGISTRY } from './registries/resourceV2';
import { RESOURCE_KEY_BY_V2_ID } from './resourceKeys';
import type { ResourceKey, ResourceV2Id } from './resourceKeys';

export { Resource, type ResourceKey, type ResourceV2Id, getResourceV2Id } from './resourceKeys';

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
