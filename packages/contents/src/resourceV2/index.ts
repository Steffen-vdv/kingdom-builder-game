import type { ResourceV2Definition, ResourceV2GroupMetadata } from '@kingdom-builder/protocol';

import { RESOURCE_V2_DEFINITIONS, type ResourceV2Id } from './definitions';
import { RESOURCE_V2_GROUPS, type ResourceV2GroupId } from './groups';

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		value.forEach((item) => {
			deepFreeze(item);
		});
		return Object.freeze(value) as unknown as T;
	}
	if (value !== null && typeof value === 'object') {
		Object.values(value as Record<string, unknown>).forEach((item) => {
			deepFreeze(item);
		});
		return Object.freeze(value) as T;
	}
	return value;
}

function freezeResource(definition: ResourceV2Definition): Readonly<ResourceV2Definition> {
	return deepFreeze(clone(definition));
}

function freezeGroup(metadata: ResourceV2GroupMetadata): Readonly<ResourceV2GroupMetadata> {
	return deepFreeze(clone(metadata));
}

export function createResourceV2Registry<const T extends readonly ResourceV2Definition[]>(definitions: T): Readonly<Record<T[number]['id'], Readonly<ResourceV2Definition>>> {
	const registry = Object.create(null) as Record<T[number]['id'], Readonly<ResourceV2Definition>>;
	const sorted = [...definitions].sort((a, b) => a.order - b.order);

	for (const definition of sorted) {
		const key = definition.id as T[number]['id'];
		if (registry[key]) {
			throw new Error(`Duplicate ResourceV2 id "${definition.id}" detected.`);
		}
		registry[key] = freezeResource(definition);
	}

	return Object.freeze(registry);
}

export function createResourceGroupRegistry<const T extends readonly ResourceV2GroupMetadata[], const R extends Readonly<Record<string, Readonly<ResourceV2Definition>>>>(
	groups: T,
	resources: R,
): Readonly<Record<T[number]['id'], Readonly<ResourceV2GroupMetadata>>> {
	const registry = Object.create(null) as Record<T[number]['id'], Readonly<ResourceV2GroupMetadata>>;
	const sorted = [...groups].sort((a, b) => a.order - b.order);
	const childToGroup = new Map<string, string>();

	for (const group of sorted) {
		const key = group.id as T[number]['id'];
		if (registry[key]) {
			throw new Error(`Duplicate ResourceGroup id "${group.id}" detected.`);
		}

		const missingChildren = group.children.filter((child) => resources[child] === undefined);
		if (missingChildren.length > 0) {
			throw new Error(`ResourceGroup "${group.id}" references unknown resources: ${missingChildren.join(', ')}`);
		}

		for (const child of group.children) {
			const owningGroup = childToGroup.get(child);
			if (owningGroup && owningGroup !== group.id) {
				throw new Error(`Resource "${child}" is already assigned to ResourceGroup "${owningGroup}".`);
			}

			const resource = resources[child];
			if (resource?.groupId !== group.id) {
				throw new Error(`Resource "${child}" declares groupId "${resource?.groupId ?? 'undefined'}" but belongs to ResourceGroup "${group.id}".`);
			}

			childToGroup.set(child, group.id);
		}

		registry[key] = freezeGroup(group);
	}

	for (const [resourceId, definition] of Object.entries(resources)) {
		const groupId = definition.groupId;
		if (!groupId) {
			continue;
		}
		const registryKey = groupId as T[number]['id'];
		if (registry[registryKey] === undefined) {
			throw new Error(`Resource "${resourceId}" references missing ResourceGroup "${groupId}".`);
		}
	}

	return Object.freeze(registry);
}

export const RESOURCE_V2 = createResourceV2Registry(RESOURCE_V2_DEFINITIONS);
export const RESOURCE_GROUPS_V2 = createResourceGroupRegistry(RESOURCE_V2_GROUPS, RESOURCE_V2);

export type { ResourceV2GroupId, ResourceV2Id };
