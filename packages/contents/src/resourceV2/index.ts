import {
	Registry,
	type ResourceV2Definition,
	resourceV2DefinitionSchema,
	type ResourceV2GroupDefinition,
	resourceV2GroupDefinitionSchema,
	type ResourceV2GroupParentDescriptor,
} from '@kingdom-builder/protocol';
import type { ZodType } from 'zod';

import { RESOURCE_V2_DEFINITIONS } from './definitions';
import { RESOURCE_V2_GROUPS } from './groups';

export interface ResourceV2DefinitionPrimaryIconCandidate {
	readonly source: 'definition';
	readonly resourceId: string;
	readonly icon: string;
}

export interface ResourceV2GroupParentPrimaryIconCandidate {
	readonly source: 'group-parent';
	readonly parentId: string;
	readonly icon: string;
}

export type ResourceV2PrimaryIconCandidate = ResourceV2DefinitionPrimaryIconCandidate | ResourceV2GroupParentPrimaryIconCandidate;

export interface ResourceV2DefinitionRegistryArtifacts {
	readonly registry: Registry<ResourceV2Definition>;
	readonly definitions: ReadonlyArray<ResourceV2Definition>;
	readonly definitionsById: Readonly<Record<string, ResourceV2Definition>>;
	readonly orderedDefinitions: ReadonlyArray<ResourceV2Definition>;
	readonly orderedIds: ReadonlyArray<string>;
	readonly definitionsByGroup: ReadonlyMap<string, ReadonlyArray<ResourceV2Definition>>;
	readonly primaryIconCandidate?: ResourceV2DefinitionPrimaryIconCandidate;
}

export interface ResourceV2GroupRegistryArtifacts {
	readonly registry: Registry<ResourceV2GroupDefinition>;
	readonly groups: ReadonlyArray<ResourceV2GroupDefinition>;
	readonly groupsById: Readonly<Record<string, ResourceV2GroupDefinition>>;
	readonly orderedGroups: ReadonlyArray<ResourceV2GroupDefinition>;
	readonly orderedIds: ReadonlyArray<string>;
	readonly orderedParents: ReadonlyArray<ResourceV2GroupParentDescriptor>;
	readonly parentDescriptorsById: Readonly<Record<string, ResourceV2GroupParentDescriptor>>;
	readonly primaryIconCandidate?: ResourceV2GroupParentPrimaryIconCandidate;
}

function compareByOrderThenId<T extends { id: string }>(getOrder: (value: T) => number) {
	return (left: T, right: T) => {
		const orderDelta = getOrder(left) - getOrder(right);

		if (orderDelta !== 0) {
			return orderDelta;
		}

		return left.id.localeCompare(right.id);
	};
}

export function createResourceV2Registry(definitions: ReadonlyArray<ResourceV2Definition> = RESOURCE_V2_DEFINITIONS): ResourceV2DefinitionRegistryArtifacts {
	const registry = new Registry<ResourceV2Definition>(resourceV2DefinitionSchema as ZodType<ResourceV2Definition>);
	const byId = new Map<string, ResourceV2Definition>();

	for (const definition of definitions) {
		registry.add(definition.id, definition);
		byId.set(definition.id, definition);
	}

	const orderedDefinitions = [...definitions].sort(compareByOrderThenId((definition) => definition.display.order));

	const definitionsByGroup = new Map<string, ResourceV2Definition[]>();

	for (const definition of orderedDefinitions) {
		if (!definition.group) {
			continue;
		}

		const members = definitionsByGroup.get(definition.group.groupId);

		if (members) {
			members.push(definition);
		} else {
			definitionsByGroup.set(definition.group.groupId, [definition]);
		}
	}

	for (const members of definitionsByGroup.values()) {
		members.sort((left, right) => {
			const leftOrder = left.group?.order ?? 0;
			const rightOrder = right.group?.order ?? 0;

			if (leftOrder !== rightOrder) {
				return leftOrder - rightOrder;
			}

			const displayOrderDelta = left.display.order - right.display.order;

			if (displayOrderDelta !== 0) {
				return displayOrderDelta;
			}

			return left.id.localeCompare(right.id);
		});
	}

	const definitionsById = Object.fromEntries(byId) as Readonly<Record<string, ResourceV2Definition>>;
	const orderedIds = orderedDefinitions.map((definition) => definition.id);
	const primaryDefinition = orderedDefinitions.find((definition) => definition.display.icon);
	const primaryIconCandidate = primaryDefinition
		? {
				source: 'definition' as const,
				resourceId: primaryDefinition.id,
				icon: primaryDefinition.display.icon!,
			}
		: undefined;

	return {
		registry,
		definitions,
		definitionsById,
		orderedDefinitions,
		orderedIds,
		definitionsByGroup: new Map(definitionsByGroup),
		...(primaryIconCandidate ? { primaryIconCandidate } : {}),
	};
}

export function createResourceGroupRegistry(groups: ReadonlyArray<ResourceV2GroupDefinition> = RESOURCE_V2_GROUPS): ResourceV2GroupRegistryArtifacts {
	const registry = new Registry<ResourceV2GroupDefinition>(resourceV2GroupDefinitionSchema as ZodType<ResourceV2GroupDefinition>);
	const byId = new Map<string, ResourceV2GroupDefinition>();
	const parentById = new Map<string, ResourceV2GroupParentDescriptor>();
	const parentList: ResourceV2GroupParentDescriptor[] = [];

	for (const group of groups) {
		registry.add(group.id, group);
		byId.set(group.id, group);

		if (!parentById.has(group.parent.id)) {
			parentById.set(group.parent.id, group.parent);
			parentList.push(group.parent);
		}
	}

	const orderedGroups = [...groups].sort(compareByOrderThenId((group) => group.order));
	const orderedIds = orderedGroups.map((group) => group.id);
	const orderedParents = parentList.sort(compareByOrderThenId((parent) => parent.display.order));
	const parentDescriptorsById = Object.fromEntries(parentById) as Readonly<Record<string, ResourceV2GroupParentDescriptor>>;
	const primaryParent = orderedParents.find((parent) => parent.display.icon);
	const primaryIconCandidate = primaryParent
		? {
				source: 'group-parent' as const,
				parentId: primaryParent.id,
				icon: primaryParent.display.icon!,
			}
		: undefined;

	return {
		registry,
		groups,
		groupsById: Object.fromEntries(byId) as Readonly<Record<string, ResourceV2GroupDefinition>>,
		orderedGroups,
		orderedIds,
		orderedParents,
		parentDescriptorsById,
		...(primaryIconCandidate ? { primaryIconCandidate } : {}),
	};
}

export function deriveResourceV2PrimaryIconCandidate(
	definitionsArtifacts: ResourceV2DefinitionRegistryArtifacts = createResourceV2Registry(),
	groupArtifacts: ResourceV2GroupRegistryArtifacts = createResourceGroupRegistry(),
): ResourceV2PrimaryIconCandidate | undefined {
	if (definitionsArtifacts.primaryIconCandidate) {
		return definitionsArtifacts.primaryIconCandidate;
	}

	return groupArtifacts.primaryIconCandidate;
}

export { RESOURCE_V2_DEFINITIONS } from './definitions';
export { RESOURCE_V2_GROUPS } from './groups';
export { resourceV2Add, resourceV2Definition, resourceV2Group, resourceV2GroupParent, resourceV2Remove, resourceV2Tier, resourceV2TierTrack } from '../config/builders/resourceV2';
