import type { ResourceV2Definition, ResourceV2GroupDefinition } from './types';

interface OrderedRegistry<T extends { id: string }> {
	readonly byId: Readonly<Record<string, T>>;
	readonly ordered: readonly T[];
}

function createOrderedRegistry<T extends { id: string }>(
	kind: string,
	definitions: readonly T[],
): OrderedRegistry<T> {
	const byId: Record<string, T> = {};
	const ordered: T[] = [];

	for (const definition of definitions) {
		if (!definition?.id) {
			throw new Error(
				`${kind} registry requires definitions with non-empty ids.`,
			);
		}
		if (byId[definition.id]) {
			throw new Error(
				`${kind} registry received duplicate id "${definition.id}".`,
			);
		}
		byId[definition.id] = definition;
		ordered.push(definition);
	}

	return {
		byId: Object.freeze(byId),
		ordered: Object.freeze([...ordered]),
	};
}

export type ResourceV2Registry = OrderedRegistry<ResourceV2Definition>;

export function createResourceV2Registry(
	definitions: readonly ResourceV2Definition[],
): ResourceV2Registry {
	return createOrderedRegistry('ResourceV2', definitions);
}

export type ResourceGroupRegistry = OrderedRegistry<ResourceV2GroupDefinition>;

export function createResourceGroupRegistry(
	definitions: readonly ResourceV2GroupDefinition[],
): ResourceGroupRegistry {
	return createOrderedRegistry('Resource group', definitions);
}
