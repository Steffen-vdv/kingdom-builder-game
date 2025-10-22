import { Registry } from '@kingdom-builder/protocol';

import type {
	ResourceV2Definition,
	ResourceV2GroupParentMetadata,
} from './types';

const DUPLICATE_RESOURCE_ID_MESSAGE =
	'ResourceV2 registry already contains a definition for the requested id. Remove the duplicate registration.';
const DUPLICATE_GROUP_ID_MESSAGE =
	'ResourceV2 group registry already contains a definition for the requested id. Remove the duplicate registration.';
const UNKNOWN_GROUP_ID_MESSAGE =
	'ResourceV2 definition references an unknown group id. Register the group parent metadata before assigning resources.';
const PARENT_DEFINED_MESSAGE =
	'ResourceV2 group parents are computed, limited resources and cannot be defined directly. Remove the conflicting definition.';
const PARENT_NOT_LIMITED_MESSAGE =
	'ResourceV2 group parents must be marked as limited resources to enforce aggregation semantics.';
const DUPLICATE_PARENT_ID_MESSAGE =
	'ResourceV2 group parent id already registered for another group. Ensure each parent id is unique.';

interface RegistryAdapter<T> extends Iterable<T> {
	add(value: T): void;
	get(id: string): T;
	has(id: string): boolean;
	entries(): [string, T][];
	values(): T[];
	keys(): string[];
}

class StrictRegistry<T> implements RegistryAdapter<T> {
	private readonly registry = new Registry<T>();
	private readonly ids = new Set<string>();

	constructor(
		private readonly duplicateMessage: string,
		private readonly selectId: (value: T) => string,
	) {}

	add(value: T) {
		const id = this.selectId(value);
		if (this.ids.has(id)) {
			throw new Error(`${this.duplicateMessage} (${id})`);
		}
		this.registry.add(id, value);
		this.ids.add(id);
	}

	get(id: string): T {
		return this.registry.get(id);
	}

	has(id: string): boolean {
		return this.registry.has(id);
	}

	entries(): [string, T][] {
		return this.registry.entries();
	}

	values(): T[] {
		return this.registry.values();
	}

	keys(): string[] {
		return this.registry.keys();
	}

	[Symbol.iterator](): Iterator<T> {
		return this.values()[Symbol.iterator]();
	}
}

export type ResourceV2DefinitionRegistry =
	RegistryAdapter<ResourceV2Definition>;

export interface ResourceV2GroupDefinition {
	id: string;
	parent: ResourceV2GroupParentMetadata;
}

export type ResourceV2GroupRegistry =
	RegistryAdapter<ResourceV2GroupDefinition>;

export interface ResourceV2GroupPresentationMetadata {
	groupId: string;
	parent: ResourceV2GroupParentMetadata;
	children: readonly ResourceV2Definition[];
}

export interface ResourceV2GlobalActionCostDeclaration {
	resourceId: string;
	amount: number;
}

export type ResourceV2OrderedValueEntry =
	| { kind: 'resource'; definition: ResourceV2Definition }
	| {
			kind: 'group-parent';
			groupId: string;
			parent: ResourceV2GroupParentMetadata;
	  };

export function createResourceV2Registry(): ResourceV2DefinitionRegistry {
	return new StrictRegistry<ResourceV2Definition>(
		DUPLICATE_RESOURCE_ID_MESSAGE,
		(definition) => definition.id,
	);
}

export function createResourceV2GroupRegistry(): ResourceV2GroupRegistry {
	return new StrictRegistry<ResourceV2GroupDefinition>(
		DUPLICATE_GROUP_ID_MESSAGE,
		(definition) => definition.id,
	);
}

export function freezeOrderedValues<T>(
	values: Iterable<T>,
	selectOrder: (value: T) => number,
): readonly T[] {
	const decorated = Array.from(values, (value, index) => ({
		value,
		order: selectOrder(value),
		index,
	}));

	decorated.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.index - right.index;
	});

	return Object.freeze(decorated.map((entry) => entry.value));
}

export function computeGroupParentMetadata(
	groups: ResourceV2GroupRegistry,
): Map<string, ResourceV2GroupParentMetadata> {
	const metadata = new Map<string, ResourceV2GroupParentMetadata>();
	const parentIds = new Set<string>();

	for (const [groupId, definition] of groups.entries()) {
		const parent = definition.parent;
		if (!parent.limited) {
			throw new Error(PARENT_NOT_LIMITED_MESSAGE);
		}
		if (parentIds.has(parent.id)) {
			throw new Error(`${DUPLICATE_PARENT_ID_MESSAGE} (${parent.id})`);
		}
		parentIds.add(parent.id);
		metadata.set(groupId, parent);
	}

	return metadata;
}

export function buildResourceV2GroupPresentationMetadata(
	resources: ResourceV2DefinitionRegistry,
	groups: ResourceV2GroupRegistry,
): readonly ResourceV2GroupPresentationMetadata[] {
	const parentsByGroup = computeGroupParentMetadata(groups);
	const childrenByGroup = new Map<string, ResourceV2Definition[]>();

	for (const definition of resources.values()) {
		const group = definition.group;
		if (!group) {
			continue;
		}

		if (!parentsByGroup.has(group.groupId)) {
			throw new Error(
				`${UNKNOWN_GROUP_ID_MESSAGE} (${group.groupId}, resource: ${definition.id})`,
			);
		}

		const current = childrenByGroup.get(group.groupId);
		if (current) {
			current.push(definition);
		} else {
			childrenByGroup.set(group.groupId, [definition]);
		}
	}

	const parentIds = new Set(
		Array.from(parentsByGroup.values(), (parent) => parent.id),
	);

	for (const definition of resources.values()) {
		if (parentIds.has(definition.id)) {
			throw new Error(PARENT_DEFINED_MESSAGE);
		}
	}

	const presentations: ResourceV2GroupPresentationMetadata[] = [];

	for (const [groupId, parent] of parentsByGroup.entries()) {
		const sortedChildren = freezeOrderedValues(
			childrenByGroup.get(groupId) ?? [],
			(definition) => definition.group?.order ?? definition.display.order,
		);
		presentations.push({
			groupId,
			parent,
			children: sortedChildren,
		});
	}

	return freezeOrderedValues(
		presentations,
		(presentation) => presentation.parent.order,
	);
}

export function deriveOrderedResourceV2Values(
	resources: ResourceV2DefinitionRegistry,
	groups: ResourceV2GroupRegistry,
): readonly ResourceV2OrderedValueEntry[] {
	const groupPresentations = buildResourceV2GroupPresentationMetadata(
		resources,
		groups,
	);
	const standalone = freezeOrderedValues(
		resources.values().filter((definition) => !definition.group),
		(definition) => definition.display.order,
	);

	const blocks: { order: number; entries: ResourceV2OrderedValueEntry[] }[] =
		[];

	for (const resource of standalone) {
		const entry: ResourceV2OrderedValueEntry = {
			kind: 'resource',
			definition: resource,
		};
		blocks.push({
			order: resource.display.order,
			entries: [entry],
		});
	}

	for (const group of groupPresentations) {
		const entries: ResourceV2OrderedValueEntry[] = [
			{
				kind: 'group-parent',
				groupId: group.groupId,
				parent: group.parent,
			},
		];
		for (const child of group.children) {
			entries.push({
				kind: 'resource',
				definition: child,
			});
		}
		blocks.push({
			order: group.parent.order,
			entries,
		});
	}

	const orderedBlocks = freezeOrderedValues(blocks, (block) => block.order);
	const flattened = orderedBlocks.flatMap((block) => block.entries);
	return Object.freeze(flattened);
}

export function buildGlobalActionCostDeclarations(
	resources: ResourceV2DefinitionRegistry,
): readonly ResourceV2GlobalActionCostDeclaration[] {
	const declarationsWithOrder: {
		order: number;
		declaration: ResourceV2GlobalActionCostDeclaration;
	}[] = [];

	for (const definition of resources.values()) {
		if (!definition.globalActionCost) {
			continue;
		}
		declarationsWithOrder.push({
			order: definition.display.order,
			declaration: {
				resourceId: definition.id,
				amount: definition.globalActionCost.amount,
			},
		});
	}

	const ordered = freezeOrderedValues(
		declarationsWithOrder,
		(entry) => entry.order,
	);

	return Object.freeze(ordered.map((entry) => entry.declaration));
}
