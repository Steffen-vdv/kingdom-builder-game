import type {
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionResourceGroupDescriptor,
	SessionResourceTierStatus,
	SessionResourceValueDescriptor,
	SessionResourceValueMetadata,
} from '@kingdom-builder/protocol/session';
import {
	deriveOrderedSessionResourceValues,
	freezeResourceMetadataByOrder,
} from '@kingdom-builder/protocol/session';

const deepFreeze = <T>(value: T): T => {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as unknown as T;
	}
	if (value && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	return value;
};

const buildValueDescriptors = (
	definitions: Iterable<ResourceV2DefinitionConfig>,
): Record<string, SessionResourceValueDescriptor> => {
	const descriptors: Record<string, SessionResourceValueDescriptor> = {};
	for (const definition of definitions) {
		const descriptor: SessionResourceValueDescriptor = {
			id: definition.id,
			icon: definition.display.icon,
			label: definition.display.label,
			description: definition.display.description,
			order: definition.display.order,
		};
		if (definition.display.percent) {
			descriptor.displayAsPercent = true;
		}
		if (definition.group) {
			descriptor.groupId = definition.group.groupId;
		}
		descriptors[definition.id] = deepFreeze(descriptor);
	}
	return deepFreeze(descriptors);
};

const buildGroupDescriptors = (
	definitions: Iterable<ResourceV2DefinitionConfig>,
	groups: Iterable<ResourceV2GroupDefinitionConfig>,
): Record<string, SessionResourceGroupDescriptor> => {
	const childrenByGroup = new Map<
		string,
		Array<{ id: string; order: number }>
	>();
	for (const definition of definitions) {
		const group = definition.group;
		if (!group) {
			continue;
		}
		const order = group.order ?? definition.display.order;
		const entry = childrenByGroup.get(group.groupId);
		const child = { id: definition.id, order };
		if (entry) {
			entry.push(child);
		} else {
			childrenByGroup.set(group.groupId, [child]);
		}
	}

	const descriptors: Record<string, SessionResourceGroupDescriptor> = {};
	for (const group of groups) {
		const parent = deepFreeze({ ...group.parent });
		const children = freezeResourceMetadataByOrder(
			childrenByGroup.get(group.id) ?? [],
			(entry) => entry.order,
		).map((entry) => entry.id);
		const descriptor: SessionResourceGroupDescriptor = {
			groupId: group.id,
			parent,
			order: parent.order,
		};
		if (children.length > 0) {
			descriptor.children = children;
		}
		descriptors[group.id] = deepFreeze(descriptor);
	}
	return deepFreeze(descriptors);
};

const buildTierMetadata = (
	definitions: Iterable<ResourceV2DefinitionConfig>,
): Record<string, SessionResourceTierStatus> | undefined => {
	const entries: Record<string, SessionResourceTierStatus> = {};
	for (const definition of definitions) {
		if (!definition.tierTrack) {
			continue;
		}
		const { tierTrack } = definition;
		const steps = tierTrack.steps.map((step, index) =>
			deepFreeze({
				id: step.id,
				index,
				min: step.min,
				max: step.max,
				...(step.display?.label ? { label: step.display.label } : {}),
			}),
		);
		const tierStatus: SessionResourceTierStatus = {
			trackId: tierTrack.id,
			steps: Object.freeze(steps),
		};
		entries[definition.id] = deepFreeze(tierStatus);
	}
	if (Object.keys(entries).length === 0) {
		return undefined;
	}
	return deepFreeze(entries);
};

export const buildResourceValueMetadata = (
	definitions: Iterable<ResourceV2DefinitionConfig>,
	groups: Iterable<ResourceV2GroupDefinitionConfig>,
): SessionResourceValueMetadata | undefined => {
	const definitionArray = Array.from(definitions);
	if (definitionArray.length === 0) {
		return undefined;
	}
	const groupArray = Array.from(groups);
	const descriptors = buildValueDescriptors(definitionArray);
	const groupDescriptors = buildGroupDescriptors(definitionArray, groupArray);
	const ordered = deriveOrderedSessionResourceValues(
		descriptors,
		Object.values(groupDescriptors),
	);
	const tiers = buildTierMetadata(definitionArray);
	const metadata: SessionResourceValueMetadata = {
		descriptors,
		...(Object.keys(groupDescriptors).length > 0
			? { groups: groupDescriptors }
			: {}),
		ordered,
		...(tiers ? { tiers } : {}),
	};
	return deepFreeze(metadata);
};

export { deepFreeze };
