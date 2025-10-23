import type { ResourceV2GroupMetadata } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionResourceDefinition,
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
} from '@kingdom-builder/protocol/session';
import {
	createLookup,
	createRegistryDescriptor,
	formatLabel,
} from './registryMetadataCore';
import type { RegistryDescriptorFallback } from './registryMetadataCore';
import type {
	MetadataLookup,
	RegistryMetadataDescriptor,
} from './registryMetadataTypes';

export interface BuildResourceMetadataOptions {
	resourceMetadata?:
		| Record<string, SessionResourceV2MetadataSnapshot>
		| undefined;
	orderedResourceIds?: ReadonlyArray<string> | undefined;
	parentIdByResourceId?: Readonly<Record<string, string>> | undefined;
}

const compareDescriptorOrder = (
	left: RegistryMetadataDescriptor,
	right: RegistryMetadataDescriptor,
): number => {
	const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
	const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
	if (leftOrder !== rightOrder) {
		return leftOrder - rightOrder;
	}
	return left.id.localeCompare(right.id);
};

const createOrderedEntries = <TDescriptor extends RegistryMetadataDescriptor>(
	descriptors: Map<string, TDescriptor>,
	orderedIds: ReadonlyArray<string> | undefined,
): Array<readonly [string, TDescriptor]> => {
	const entries: Array<readonly [string, TDescriptor]> = [];
	const processed = new Set<string>();
	if (orderedIds && orderedIds.length > 0) {
		for (const id of orderedIds) {
			const descriptor = descriptors.get(id);
			if (!descriptor) {
				continue;
			}
			entries.push([id, descriptor]);
			processed.add(id);
		}
	}
	const remaining: Array<readonly [string, TDescriptor]> = [];
	for (const [id, descriptor] of descriptors) {
		if (processed.has(id)) {
			continue;
		}
		remaining.push([id, descriptor]);
	}
	remaining.sort((left, right) => compareDescriptorOrder(left[1], right[1]));
	entries.push(...remaining);
	return entries;
};

export const buildResourceMetadata = (
	resources: Record<string, SessionResourceDefinition>,
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
	options: BuildResourceMetadataOptions = {},
): MetadataLookup<RegistryMetadataDescriptor> => {
	const resourceMetadata = options.resourceMetadata ?? {};
	const parentIdByResourceId = options.parentIdByResourceId ?? {};
	const ids = new Set<string>();
	for (const key of Object.keys(resources)) {
		ids.add(key);
	}
	if (metadata) {
		for (const key of Object.keys(metadata)) {
			ids.add(key);
		}
	}
	for (const key of Object.keys(resourceMetadata)) {
		ids.add(key);
	}
	if (options.orderedResourceIds) {
		for (const key of options.orderedResourceIds) {
			ids.add(key);
		}
	}
	const descriptors = new Map<string, RegistryMetadataDescriptor>();
	for (const id of ids) {
		const definition = resources[id];
		const descriptorMetadata = metadata?.[id];
		const snapshot = resourceMetadata[id];
		const fallback: RegistryDescriptorFallback = {
			label: snapshot?.name ?? definition?.label ?? definition?.key ?? id,
			icon: snapshot?.icon ?? definition?.icon,
			description: snapshot?.description ?? definition?.description,
			metadata: snapshot?.metadata,
			limited: snapshot?.limited,
			groupId: snapshot?.groupId,
			parentId: snapshot?.parentId ?? parentIdByResourceId[id],
			isPercent: snapshot?.isPercent,
			trackValueBreakdown: snapshot?.trackValueBreakdown,
			trackBoundBreakdown: snapshot?.trackBoundBreakdown,
			lowerBound: snapshot?.lowerBound,
			upperBound: snapshot?.upperBound,
			tierTrack: snapshot?.tierTrack,
			globalActionCost: snapshot?.globalActionCost,
			order: snapshot?.order,
		};
		const descriptor = createRegistryDescriptor(
			id,
			descriptorMetadata,
			fallback,
		);
		descriptors.set(id, descriptor);
	}
	const orderedEntries = createOrderedEntries(
		descriptors,
		options.orderedResourceIds,
	);
	return createLookup(orderedEntries, (id: string) =>
		createRegistryDescriptor(id, undefined, { label: formatLabel(id) }),
	);
};

export const buildResourceGroupMetadata = (
	groups: Record<string, ResourceV2GroupMetadata>,
	metadata: Record<string, SessionResourceV2GroupSnapshot> | undefined,
	orderedGroupIds: ReadonlyArray<string> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> => {
	const ids = new Set<string>();
	for (const key of Object.keys(groups)) {
		ids.add(key);
	}
	if (metadata) {
		for (const key of Object.keys(metadata)) {
			ids.add(key);
		}
	}
	if (orderedGroupIds) {
		for (const key of orderedGroupIds) {
			ids.add(key);
		}
	}
	const descriptors = new Map<string, RegistryMetadataDescriptor>();
	for (const id of ids) {
		const definition = groups[id];
		const snapshot = metadata?.[id];
		const fallback: RegistryDescriptorFallback = {
			label: snapshot?.name ?? definition?.name ?? formatLabel(id),
			icon: snapshot?.icon ?? definition?.icon,
			description: snapshot?.description ?? definition?.description,
			metadata: snapshot?.metadata ?? definition?.metadata,
			children: snapshot?.children ?? definition?.children,
			order: snapshot?.order ?? definition?.order,
			parentId: snapshot?.parent?.id ?? definition?.parent?.id,
		};
		const descriptor = createRegistryDescriptor(id, undefined, fallback);
		descriptors.set(id, descriptor);
	}
	const orderedEntries = createOrderedEntries(descriptors, orderedGroupIds);
	return createLookup(orderedEntries, (id: string) =>
		createRegistryDescriptor(id, undefined, { label: formatLabel(id) }),
	);
};

export const buildResourceGroupParentMetadata = (
	groups: Record<string, ResourceV2GroupMetadata>,
	metadata: Record<string, SessionResourceV2GroupParentSnapshot> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> => {
	const parentDefinitions: Record<string, ResourceV2GroupMetadata['parent']> =
		{};
	for (const group of Object.values(groups)) {
		if (group.parent) {
			parentDefinitions[group.parent.id] = group.parent;
		}
	}
	const ids = new Set<string>();
	for (const key of Object.keys(parentDefinitions)) {
		ids.add(key);
	}
	if (metadata) {
		for (const key of Object.keys(metadata)) {
			ids.add(key);
		}
	}
	const descriptors = new Map<string, RegistryMetadataDescriptor>();
	for (const id of ids) {
		const definition = parentDefinitions[id];
		const snapshot = metadata?.[id];
		const fallback: RegistryDescriptorFallback = {
			label: snapshot?.name ?? definition?.name ?? formatLabel(id),
			icon: snapshot?.icon ?? definition?.icon,
			description: snapshot?.description ?? definition?.description,
			metadata: snapshot?.metadata ?? definition?.metadata,
			limited: snapshot?.limited ?? definition?.limited,
			isPercent: snapshot?.isPercent ?? definition?.isPercent,
			trackValueBreakdown:
				snapshot?.trackValueBreakdown ?? definition?.trackValueBreakdown,
			trackBoundBreakdown:
				snapshot?.trackBoundBreakdown ?? definition?.trackBoundBreakdown,
			lowerBound: snapshot?.lowerBound ?? definition?.lowerBound,
			upperBound: snapshot?.upperBound ?? definition?.upperBound,
			tierTrack: snapshot?.tierTrack ?? definition?.tierTrack,
			relation: snapshot?.relation ?? definition?.relation,
			order: snapshot?.order ?? definition?.order,
		};
		const descriptor = createRegistryDescriptor(id, undefined, fallback);
		descriptors.set(id, descriptor);
	}
	const entries = Array.from(descriptors.entries()).sort((left, right) =>
		compareDescriptorOrder(left[1], right[1]),
	);
	return createLookup(entries, (id: string) =>
		createRegistryDescriptor(id, undefined, { label: formatLabel(id) }),
	);
};
