import type { ResourceCategoryDefinition, ResourceDefinition, ResourceGroupDefinition } from './types';

interface OrderedRegistry<T extends { id: string }> {
	readonly byId: Readonly<Record<string, T>>;
	readonly ordered: readonly T[];
}

function createOrderedRegistry<T extends { id: string }>(kind: string, definitions: readonly T[]): OrderedRegistry<T> {
	const byId: Record<string, T> = {};
	const ordered: T[] = [];

	for (const definition of definitions) {
		if (!definition?.id) {
			throw new Error(`${kind} registry requires definitions with non-empty ids.`);
		}
		if (byId[definition.id]) {
			throw new Error(`${kind} registry received duplicate id "${definition.id}".`);
		}
		byId[definition.id] = definition;
		ordered.push(definition);
	}

	return {
		byId: Object.freeze(byId),
		ordered: Object.freeze([...ordered]),
	};
}

export type ResourceRegistry = OrderedRegistry<ResourceDefinition>;

export function createResourceRegistry(definitions: readonly ResourceDefinition[]): ResourceRegistry {
	return createOrderedRegistry('Resource', definitions);
}

export type ResourceGroupRegistry = OrderedRegistry<ResourceGroupDefinition>;

export function createResourceGroupRegistry(definitions: readonly ResourceGroupDefinition[]): ResourceGroupRegistry {
	return createOrderedRegistry('Resource group', definitions);
}

export type ResourceCategoryRegistry = OrderedRegistry<ResourceCategoryDefinition>;

export function createResourceCategoryRegistry(definitions: readonly ResourceCategoryDefinition[]): ResourceCategoryRegistry {
	return createOrderedRegistry('Resource category', definitions);
}
