import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	SerializedRegistry,
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
} from '@kingdom-builder/protocol';

export interface SessionResourceV2StaticMetadata {
	resourceMetadata?: Record<string, SessionResourceV2MetadataSnapshot>;
	resourceGroups?: Record<string, SessionResourceV2GroupSnapshot>;
	resourceGroupParents?: Record<string, SessionResourceV2GroupParentSnapshot>;
	orderedResourceIds?: string[];
	orderedResourceGroupIds?: string[];
	parentIdByResourceId?: Record<string, string>;
}

type ResourceV2DefinitionMap = SerializedRegistry<ResourceV2Definition>;

type ResourceV2GroupMap = SerializedRegistry<ResourceV2GroupMetadata>;

type ResourceV2MetadataResult = SessionResourceV2StaticMetadata;

export function buildResourceV2Metadata(
	resources?: ResourceV2DefinitionMap,
	groups?: ResourceV2GroupMap,
): ResourceV2MetadataResult {
	if (!resources && !groups) {
		return {};
	}
	const resourceEntries = resources
		? Object.values(resources).filter(Boolean)
		: [];
	const groupEntries = groups ? Object.values(groups).filter(Boolean) : [];
	const orderedGroups = sortByOrder(groupEntries);
	const resourceGroups: Record<string, SessionResourceV2GroupSnapshot> = {};
	const resourceGroupParents: Record<
		string,
		SessionResourceV2GroupParentSnapshot
	> = {};
	const parentIdByResourceId: Record<string, string> = {};
	for (const group of orderedGroups) {
		const snapshot: SessionResourceV2GroupSnapshot = {
			id: group.id,
			name: group.name,
			order: group.order,
			children: [...group.children],
		};
		if (group.icon) {
			snapshot.icon = group.icon;
		}
		if (group.description) {
			snapshot.description = group.description;
		}
		if (group.metadata) {
			snapshot.metadata = structuredClone(group.metadata);
		}
		if (group.parent) {
			const parentSnapshot = buildResourceV2ParentSnapshot(group.parent);
			snapshot.parent = parentSnapshot;
			resourceGroupParents[parentSnapshot.id] = parentSnapshot;
			for (const child of group.children) {
				parentIdByResourceId[child] = parentSnapshot.id;
			}
		}
		resourceGroups[group.id] = snapshot;
	}
	const orderedGroupIds = orderedGroups.map((group) => group.id);
	const orderedResources = sortByOrder(resourceEntries);
	const resourceMetadata: Record<string, SessionResourceV2MetadataSnapshot> =
		{};
	for (const definition of orderedResources) {
		const parentId = parentIdByResourceId[definition.id];
		const snapshot = buildResourceV2DefinitionSnapshot(definition, parentId);
		resourceMetadata[definition.id] = snapshot;
	}
	const orderedResourceIds = orderedResources.map(
		(definition) => definition.id,
	);
	const result: ResourceV2MetadataResult = {};
	if (orderedResourceIds.length > 0) {
		result.resourceMetadata = resourceMetadata;
		result.orderedResourceIds = orderedResourceIds;
	}
	if (orderedGroupIds.length > 0) {
		result.resourceGroups = resourceGroups;
		result.orderedResourceGroupIds = orderedGroupIds;
	}
	if (Object.keys(resourceGroupParents).length > 0) {
		result.resourceGroupParents = resourceGroupParents;
	}
	if (Object.keys(parentIdByResourceId).length > 0) {
		result.parentIdByResourceId = parentIdByResourceId;
	}
	return result;
}

function buildResourceV2DefinitionSnapshot(
	definition: ResourceV2Definition,
	parentId?: string,
): SessionResourceV2MetadataSnapshot {
	const snapshot: SessionResourceV2MetadataSnapshot = {
		id: definition.id,
		name: definition.name,
		order: definition.order,
		isPercent: definition.isPercent ?? false,
		trackValueBreakdown: definition.trackValueBreakdown ?? false,
		trackBoundBreakdown: definition.trackBoundBreakdown ?? false,
	};
	if (definition.icon) {
		snapshot.icon = definition.icon;
	}
	if (definition.description) {
		snapshot.description = definition.description;
	}
	if (definition.metadata) {
		snapshot.metadata = structuredClone(definition.metadata);
	}
	if (definition.limited !== undefined) {
		snapshot.limited = definition.limited;
	}
	if (definition.groupId) {
		snapshot.groupId = definition.groupId;
	}
	if (parentId) {
		snapshot.parentId = parentId;
	}
	if (definition.lowerBound !== undefined) {
		snapshot.lowerBound = definition.lowerBound;
	}
	if (definition.upperBound !== undefined) {
		snapshot.upperBound = definition.upperBound;
	}
	if (definition.tierTrack) {
		snapshot.tierTrack = structuredClone(definition.tierTrack);
	}
	if (definition.globalActionCost) {
		snapshot.globalActionCost = structuredClone(definition.globalActionCost);
	}
	return snapshot;
}

function buildResourceV2ParentSnapshot(
	parent: ResourceV2GroupMetadata['parent'],
): SessionResourceV2GroupParentSnapshot {
	if (!parent) {
		throw new Error('Expected parent metadata to be defined.');
	}
	const snapshot: SessionResourceV2GroupParentSnapshot = {
		id: parent.id,
		name: parent.name,
		order: parent.order,
		relation: parent.relation,
		isPercent: parent.isPercent ?? false,
		trackValueBreakdown: parent.trackValueBreakdown ?? false,
		trackBoundBreakdown: parent.trackBoundBreakdown ?? false,
	};
	if (parent.metadata) {
		snapshot.metadata = structuredClone(parent.metadata);
	}
	if (parent.limited !== undefined) {
		snapshot.limited = parent.limited;
	}
	if (parent.icon) {
		snapshot.icon = parent.icon;
	}
	if (parent.description) {
		snapshot.description = parent.description;
	}
	if (parent.lowerBound !== undefined) {
		snapshot.lowerBound = parent.lowerBound;
	}
	if (parent.upperBound !== undefined) {
		snapshot.upperBound = parent.upperBound;
	}
	if (parent.tierTrack) {
		snapshot.tierTrack = structuredClone(parent.tierTrack);
	}
	return snapshot;
}

function sortByOrder<T extends { order: number; id: string }>(
	values: T[],
): T[] {
	return [...values].sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.id.localeCompare(right.id);
	});
}
