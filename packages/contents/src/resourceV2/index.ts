import type { ResourceV2Definition, ResourceV2GroupMetadata } from '@kingdom-builder/protocol';

import { ResourceV2Builder, ResourceV2GroupBuilder, resourceGroup, resourceV2 } from '../config/builders';

type ResourceV2Entry = ResourceV2Definition | ResourceV2Builder | ((builder: ResourceV2Builder) => ResourceV2Builder);

type ResourceGroupEntry = ResourceV2GroupMetadata | ResourceV2GroupBuilder | ((builder: ResourceV2GroupBuilder) => ResourceV2GroupBuilder);

type PlainObject = Record<string, unknown>;

export type ResourceV2Registry = Readonly<Record<string, Readonly<ResourceV2Definition>>>;

export type ResourceV2GroupRegistry = Readonly<Record<string, Readonly<ResourceV2GroupMetadata>>>;

function cloneValue<T>(value: T): T {
	if (Array.isArray(value)) {
		const clonedItems = (value as unknown[]).map((item) => cloneValue(item));
		return clonedItems as unknown as T;
	}
	if (value && typeof value === 'object') {
		const source = value as PlainObject;
		const result: PlainObject = {};
		for (const key of Object.keys(source)) {
			result[key] = cloneValue(source[key]);
		}
		return result as T;
	}
	return value;
}

function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		for (const item of value as unknown[]) {
			deepFreeze(item);
		}
		return Object.freeze(value) as T;
	}
	if (value && typeof value === 'object') {
		const source = value as PlainObject;
		for (const key of Object.keys(source)) {
			deepFreeze(source[key]);
		}
		return Object.freeze(source) as T;
	}
	return value;
}

function cloneAndFreeze<T>(value: T): T {
	return deepFreeze(cloneValue(value));
}

function buildResource(entry: ResourceV2Entry): ResourceV2Definition {
	if (entry instanceof ResourceV2Builder) {
		return entry.build();
	}
	if (typeof entry === 'function') {
		return entry(resourceV2()).build();
	}
	return cloneValue(entry);
}

function buildGroup(entry: ResourceGroupEntry): ResourceV2GroupMetadata {
	if (entry instanceof ResourceV2GroupBuilder) {
		return entry.build();
	}
	if (typeof entry === 'function') {
		return entry(resourceGroup()).build();
	}
	return cloneValue(entry);
}

function assertUniqueOrder(kind: string, id: string, order: number, tracker: Map<number, string>) {
	const existingId = tracker.get(order);
	if (existingId) {
		throw new Error(`${kind} "${id}" reuses order ${order}, which is already assigned to "${existingId}". Assign unique order values.`);
	}
	tracker.set(order, id);
}

function assertUniqueId(kind: string, id: string, ids: Set<string>) {
	if (ids.has(id)) {
		throw new Error(`${kind} "${id}" is defined more than once. Ensure each id is unique.`);
	}
	ids.add(id);
}

export function createResourceV2Registry(entries: readonly ResourceV2Entry[]): ResourceV2Registry {
	const definitions = entries.map(buildResource);
	definitions.sort((a, b) => (a.order === b.order ? a.id.localeCompare(b.id) : a.order - b.order));

	const ids = new Set<string>();
	const orders = new Map<number, string>();
	const record: Record<string, Readonly<ResourceV2Definition>> = {};

	for (const definition of definitions) {
		assertUniqueId('ResourceV2', definition.id, ids);
		assertUniqueOrder('ResourceV2', definition.id, definition.order, orders);
		record[definition.id] = cloneAndFreeze(definition);
	}

	return Object.freeze(record) as ResourceV2Registry;
}

export function createResourceGroupRegistry(entries: readonly ResourceGroupEntry[], resources: ResourceV2Registry): ResourceV2GroupRegistry {
	const groups = entries.map(buildGroup);
	groups.sort((a, b) => (a.order === b.order ? a.id.localeCompare(b.id) : a.order - b.order));

	const ids = new Set<string>();
	const orders = new Map<number, string>();
	const childOwners = new Map<string, string>();
	const record: Record<string, Readonly<ResourceV2GroupMetadata>> = {};

	for (const group of groups) {
		assertUniqueId('ResourceGroup', group.id, ids);
		assertUniqueOrder('ResourceGroup', group.id, group.order, orders);

		for (const childId of group.children) {
			const resource = resources[childId];
			if (!resource) {
				throw new Error(`ResourceGroup "${group.id}" references unknown resource "${childId}". Add the resource to the ResourceV2 registry first.`);
			}
			if (resource.groupId !== group.id) {
				throw new Error(`Resource "${childId}" must declare groupId("${group.id}") before it can join ResourceGroup "${group.id}".`);
			}
			const existingOwner = childOwners.get(childId);
			if (existingOwner && existingOwner !== group.id) {
				throw new Error(`Resource "${childId}" already belongs to ResourceGroup "${existingOwner}". Remove it from that group before assigning it to "${group.id}".`);
			}
			childOwners.set(childId, group.id);
		}

		record[group.id] = cloneAndFreeze({
			...group,
			children: [...group.children],
		}) as Readonly<ResourceV2GroupMetadata>;
	}

	for (const resource of Object.values(resources)) {
		if (resource.groupId && !childOwners.has(resource.id)) {
			throw new Error(`Resource "${resource.id}" declares groupId("${resource.groupId}") but is missing from the ResourceGroup registry. Add it to the matching group.`);
		}
	}

	return Object.freeze(record) as ResourceV2GroupRegistry;
}

const resourceDefinitions: ResourceV2Entry[] = [];
const resourceGroupDefinitions: ResourceGroupEntry[] = [];

export const RESOURCE_V2 = createResourceV2Registry(resourceDefinitions);

export const RESOURCE_GROUPS_V2 = createResourceGroupRegistry(resourceGroupDefinitions, RESOURCE_V2);
