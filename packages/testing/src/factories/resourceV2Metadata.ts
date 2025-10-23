import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	ResourceV2GroupParent,
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
} from '@kingdom-builder/protocol';

const clone = <T>(value: T): T => structuredClone(value);

const buildParentSnapshot = (
	parent: ResourceV2GroupParent,
): SessionResourceV2GroupParentSnapshot => {
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
		snapshot.metadata = clone(parent.metadata);
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
		snapshot.tierTrack = clone(parent.tierTrack);
	}
	return snapshot;
};

const buildResourceSnapshot = (
	definition: ResourceV2Definition,
	parentId?: string,
): SessionResourceV2MetadataSnapshot => {
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
		snapshot.metadata = clone(definition.metadata);
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
		snapshot.tierTrack = clone(definition.tierTrack);
	}
	if (definition.globalActionCost) {
		snapshot.globalActionCost = clone(definition.globalActionCost);
	}
	return snapshot;
};

const sortByOrder = <T extends { order: number; id: string }>(
	values: Iterable<T>,
): T[] =>
	Array.from(values).sort((left, right) =>
		left.order === right.order
			? left.id.localeCompare(right.id)
			: left.order - right.order,
	);

export interface ResourceV2SessionMetadata {
	resourceMetadata: Record<string, SessionResourceV2MetadataSnapshot>;
	resourceGroups: Record<string, SessionResourceV2GroupSnapshot>;
	resourceGroupParents: Record<string, SessionResourceV2GroupParentSnapshot>;
	orderedResourceIds: string[];
	orderedResourceGroupIds: string[];
	parentIdByResourceId: Record<string, string>;
}

export function buildResourceV2SessionMetadata(
	resources: Iterable<ResourceV2Definition>,
	groups: Iterable<ResourceV2GroupMetadata>,
): ResourceV2SessionMetadata {
	const orderedGroups = sortByOrder(groups);
	const orderedResources = sortByOrder(resources);
	const resourceMetadata: Record<string, SessionResourceV2MetadataSnapshot> =
		{};
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
			snapshot.metadata = clone(group.metadata);
		}
		if (group.parent) {
			const parentSnapshot = buildParentSnapshot(group.parent);
			snapshot.parent = parentSnapshot;
			resourceGroupParents[parentSnapshot.id] = parentSnapshot;
			for (const child of group.children) {
				parentIdByResourceId[child] = parentSnapshot.id;
			}
		}
		resourceGroups[group.id] = snapshot;
	}

	for (const definition of orderedResources) {
		const parentId = parentIdByResourceId[definition.id];
		resourceMetadata[definition.id] = buildResourceSnapshot(
			definition,
			parentId,
		);
	}

	return {
		resourceMetadata,
		resourceGroups,
		resourceGroupParents,
		orderedResourceIds: orderedResources.map((definition) => definition.id),
		orderedResourceGroupIds: orderedGroups.map((group) => group.id),
		parentIdByResourceId,
	} satisfies ResourceV2SessionMetadata;
}
