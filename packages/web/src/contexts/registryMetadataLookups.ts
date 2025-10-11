import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import type { Registry } from '@kingdom-builder/protocol';

const freezeArray = <T>(values: Iterable<T>): ReadonlyArray<T> =>
	Object.freeze(Array.from(values));

const freezeEntries = <T>(entries: Iterable<readonly [string, T]>) =>
	Object.freeze(Array.from(entries, ([id, value]) => [id, value] as const));

export interface DefinitionLookup<T> {
	readonly record: Readonly<Record<string, T>>;
	entries(): ReadonlyArray<readonly [string, T]>;
	values(): ReadonlyArray<T>;
	keys(): ReadonlyArray<string>;
	has(id: string): boolean;
	get(id: string): T | undefined;
	getOrThrow(id: string): T;
}

const createDefinitionLookup = <T>(
	typeName: string,
	entries: Iterable<readonly [string, T]>,
): DefinitionLookup<T> => {
	const map = new Map<string, T>();
	for (const [id, value] of entries) {
		map.set(id, value);
	}
	const record = Object.freeze(Object.fromEntries(map)) as Readonly<
		Record<string, T>
	>;
	const get = (id: string): T | undefined => map.get(id);
	const getOrThrow = (id: string): T => {
		const value = map.get(id);
		if (!value) {
			throw new Error(`Unknown ${typeName} id: ${id}`);
		}
		return value;
	};
	return Object.freeze({
		record,
		entries: () => freezeEntries(map.entries()),
		values: () => freezeArray(map.values()),
		keys: () => freezeArray(map.keys()),
		has: (id: string) => map.has(id),
		get,
		getOrThrow,
	});
};

export function createRegistryLookup<T extends { id: string }>(
	registry: Registry<T>,
	typeName: string,
): DefinitionLookup<T> {
	return createDefinitionLookup(
		typeName,
		registry.entries().map(([id, definition]) => [id, definition] as const),
	);
}

export function createResourceLookup(
	resources: Record<string, SessionResourceDefinition>,
): DefinitionLookup<SessionResourceDefinition> {
	return createDefinitionLookup(
		'resource',
		Object.entries(resources).map(
			([key, definition]) => [key, definition] as const,
		),
	);
}
