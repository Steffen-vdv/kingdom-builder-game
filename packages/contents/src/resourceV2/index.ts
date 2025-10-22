import * as protocol from '@kingdom-builder/protocol';
import type { ResourceV2Definition, ResourceV2GroupDefinition, ResourceV2GroupParentDescriptor } from '@kingdom-builder/protocol';

import type { ResourceV2DefinitionBuilder, ResourceV2GroupBuilder } from '../config/builders/resourceV2';

export type ResourceV2TopLevelEntry =
	| {
			readonly kind: 'group';
			readonly group: ResourceV2GroupDefinition;
			readonly parent: ResourceV2GroupParentDescriptor;
			readonly children: ReadonlyArray<ResourceV2Definition>;
	  }
	| {
			readonly kind: 'resource';
			readonly resource: ResourceV2Definition;
	  };

const RESOURCE_V2_DEFINITION_BUILDERS: ResourceV2DefinitionBuilder[] = [
	// Populate with resourceV2Definition('id') builders as resources migrate to ResourceV2.
];

const RESOURCE_V2_GROUP_BUILDERS: ResourceV2GroupBuilder[] = [
	// Populate with resourceV2Group('group-id') builders as groups migrate to ResourceV2.
];

export const RESOURCE_V2_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = RESOURCE_V2_DEFINITION_BUILDERS.map((builder) => builder.build());

export const RESOURCE_V2_GROUPS: ReadonlyArray<ResourceV2GroupDefinition> = RESOURCE_V2_GROUP_BUILDERS.map((builder) => builder.build());

export function createResourceGroupRegistry(groupDefinitions: ReadonlyArray<ResourceV2GroupDefinition> = RESOURCE_V2_GROUPS) {
	const registry = new protocol.Registry(protocol.resourceV2GroupDefinitionSchema) as protocol.Registry<ResourceV2GroupDefinition>;

	groupDefinitions.forEach((definition) => {
		registry.add(definition.id, definition);
	});

	const orderedGroups = [...groupDefinitions].sort((a, b) => a.order - b.order);

	const childrenByGroupId = new Map<string, ReadonlyArray<string>>();
	const parentByGroupId = new Map<string, ResourceV2GroupParentDescriptor>();

	orderedGroups.forEach((group) => {
		childrenByGroupId.set(group.id, [...group.children]);
		parentByGroupId.set(group.id, group.parent);
	});

	return {
		registry,
		definitions: groupDefinitions,
		orderedGroups,
		childrenByGroupId,
		parentByGroupId,
	};
}

export function createResourceV2Registry(
	definitions: ReadonlyArray<ResourceV2Definition> = RESOURCE_V2_DEFINITIONS,
	groupRegistry: ReturnType<typeof createResourceGroupRegistry> = createResourceGroupRegistry(),
) {
	const registry = new protocol.Registry(protocol.resourceV2DefinitionSchema) as protocol.Registry<ResourceV2Definition>;
	const groupedResources = new Map<string, ResourceV2Definition[]>();
	const groupedIds = new Set<string>();

	definitions.forEach((definition) => {
		registry.add(definition.id, definition);

		const groupDescriptor = definition.group;

		if (!groupDescriptor) {
			return;
		}

		if (!groupRegistry.registry.has(groupDescriptor.groupId)) {
			return;
		}

		const bucket = groupedResources.get(groupDescriptor.groupId);

		if (bucket) {
			bucket.push(definition);
		} else {
			groupedResources.set(groupDescriptor.groupId, [definition]);
		}

		groupedIds.add(definition.id);
	});

	groupedResources.forEach((resources) => {
		resources.sort((a, b) => a.group!.order - b.group!.order);
	});

	const standaloneResources = definitions
		.filter((definition) => !groupedIds.has(definition.id))
		.slice()
		.sort((a, b) => a.display.order - b.display.order);

	const topLevelEntries = buildTopLevelEntries(groupRegistry, groupedResources, standaloneResources);
	const primaryIconCandidate = derivePrimaryIconCandidate(topLevelEntries);

	const groupedLookup = new Map(Array.from(groupedResources.entries(), ([groupId, resources]) => [groupId, [...resources]] as const));

	return {
		registry,
		definitions,
		topLevelEntries,
		groupedResources: groupedLookup,
		standaloneResources,
		primaryIconCandidate,
	};
}

function buildTopLevelEntries(
	groupRegistry: ReturnType<typeof createResourceGroupRegistry>,
	groupedResources: Map<string, ResourceV2Definition[]>,
	standaloneResources: ReadonlyArray<ResourceV2Definition>,
): ReadonlyArray<ResourceV2TopLevelEntry> {
	const entriesWithOrder: Array<{ order: number; entry: ResourceV2TopLevelEntry }> = [];

	groupRegistry.orderedGroups.forEach((group) => {
		const children = groupedResources.get(group.id) ?? [];
		entriesWithOrder.push({
			order: group.order,
			entry: { kind: 'group', group, parent: group.parent, children },
		});
	});

	standaloneResources.forEach((resource) => {
		entriesWithOrder.push({
			order: resource.display.order,
			entry: { kind: 'resource', resource },
		});
	});

	return entriesWithOrder.sort((a, b) => a.order - b.order).map(({ entry }) => entry);
}

function derivePrimaryIconCandidate(entries: ReadonlyArray<ResourceV2TopLevelEntry>) {
	for (const entry of entries) {
		if (entry.kind === 'group') {
			const groupIcon = entry.parent.display.icon;
			if (groupIcon) {
				return groupIcon;
			}

			for (const child of entry.children) {
				const childIcon = child.display.icon;
				if (childIcon) {
					return childIcon;
				}
			}

			continue;
		}

		const resourceIcon = entry.resource.display.icon;

		if (resourceIcon) {
			return resourceIcon;
		}
	}

	return undefined;
}

export type ResourceV2GroupRegistry = ReturnType<typeof createResourceGroupRegistry>;
export type ResourceV2Registry = ReturnType<typeof createResourceV2Registry>;

export { resourceV2Definition, resourceV2Group } from '../config/builders/resourceV2';
