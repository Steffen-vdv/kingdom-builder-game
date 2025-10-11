import type { Registry } from '@kingdom-builder/protocol';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';

export interface DefinitionLookup<TValue> {
	readonly record: Readonly<Record<string, TValue>>;
	entries(): ReadonlyArray<readonly [string, TValue]>;
	get(id: string): TValue | undefined;
	getOrThrow(id: string): TValue;
	has(id: string): boolean;
	keys(): ReadonlyArray<string>;
	values(): ReadonlyArray<TValue>;
}

const freezeEntries = <TValue>(
	entries: Iterable<readonly [string, TValue]>,
): ReadonlyArray<readonly [string, TValue]> =>
	Object.freeze(
		Array.from(entries, (entry) => Object.freeze([...entry] as const)),
	);

const freezeValues = <TValue>(
	values: Iterable<TValue>,
): ReadonlyArray<TValue> => Object.freeze(Array.from(values));

const createLookup = <TValue>(
	entries: Iterable<readonly [string, TValue]>,
	typeName: string,
): DefinitionLookup<TValue> => {
	const map = new Map<string, TValue>(entries);
	const record = Object.freeze(Object.fromEntries(map)) as Readonly<
		Record<string, TValue>
	>;
	const entryList = freezeEntries(map.entries());
	const keyList = freezeValues(map.keys());
	const valueList = freezeValues(map.values());
	const get = (id: string): TValue | undefined => record[id];
	const getOrThrow = (id: string): TValue => {
		const value = get(id);
		if (value !== undefined) {
			return value;
		}
		throw new Error(`Unknown ${typeName} id: ${id}`);
	};
	return Object.freeze({
		record,
		entries: () => entryList,
		get,
		getOrThrow,
		has: (id: string) => map.has(id),
		keys: () => keyList,
		values: () => valueList,
	});
};

export const createRegistryLookup = <TDefinition extends { id: string }>(
	registry: Registry<TDefinition>,
	typeName: string,
): DefinitionLookup<TDefinition> => createLookup(registry.entries(), typeName);

export const createResourceLookup = (
	resources: Record<string, SessionResourceDefinition>,
): DefinitionLookup<SessionResourceDefinition> =>
	createLookup(Object.entries(resources), 'resource');
