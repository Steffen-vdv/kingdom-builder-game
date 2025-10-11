import type { Registry } from '@kingdom-builder/protocol';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';

export interface DefinitionLookup<TValue> {
	readonly record: Readonly<Record<string, TValue>>;
	get(id: string): TValue | undefined;
	getOrThrow(id: string): TValue;
	has(id: string): boolean;
	keys(): ReadonlyArray<string>;
	values(): ReadonlyArray<TValue>;
	entries(): ReadonlyArray<readonly [string, TValue]>;
}

const freezeEntries = <TValue>(
	entries: Array<readonly [string, TValue]>,
): ReadonlyArray<readonly [string, TValue]> => Object.freeze(entries.slice());

const freezeValues = <TValue>(values: TValue[]): ReadonlyArray<TValue> =>
	Object.freeze(values.slice());

const freezeKeys = (keys: string[]): ReadonlyArray<string> =>
	Object.freeze(keys.slice());

const createDefinitionLookup = <TValue>(
	entries: Array<readonly [string, TValue]>,
	getOrThrow: (id: string) => TValue,
): DefinitionLookup<TValue> => {
	const map = new Map(entries);
	const record = Object.freeze(Object.fromEntries(entries));
	const keys = freezeKeys(entries.map(([id]) => id));
	const values = freezeValues(entries.map(([, value]) => value));
	const frozenEntries = freezeEntries(entries);
	return Object.freeze({
		record,
		get: (id: string) => map.get(id),
		getOrThrow,
		has: (id: string) => map.has(id),
		keys: () => keys,
		values: () => values,
		entries: () => frozenEntries,
	});
};

export const createRegistryLookup = <TValue>(
	registry: Registry<TValue>,
	typeLabel: string,
): DefinitionLookup<TValue> => {
	const entries = registry.entries().map(([id, value]) => [id, value] as const);
	const resolve = (id: string): TValue => {
		const value = registry.has(id) ? registry.get(id) : undefined;
		if (value === undefined) {
			throw new Error(`Unknown ${typeLabel} id: ${id}`);
		}
		return value;
	};
	return createDefinitionLookup(entries, resolve);
};

export const createResourceLookup = (
	resources: Record<string, SessionResourceDefinition>,
): DefinitionLookup<SessionResourceDefinition> => {
	const entries = Object.entries(resources).map(
		([key, definition]) => [key, definition] as const,
	);
	const resolve = (id: string): SessionResourceDefinition => {
		const value = resources[id];
		if (!value) {
			throw new Error(`Unknown resource key: ${id}`);
		}
		return value;
	};
	return createDefinitionLookup(entries, resolve);
};
