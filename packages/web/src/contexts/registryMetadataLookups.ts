import type { Registry } from '@kingdom-builder/protocol';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import { clone } from '../state/clone';

export interface DefinitionLookup<TDefinition> {
	readonly record: Readonly<Record<string, TDefinition>>;
	get(id: string): TDefinition | undefined;
	getOrThrow(id: string): TDefinition;
	has(id: string): boolean;
	entries(): ReadonlyArray<readonly [string, TDefinition]>;
	values(): ReadonlyArray<TDefinition>;
	keys(): ReadonlyArray<string>;
}

const freezeArray = <TValue>(values: Iterable<TValue>): ReadonlyArray<TValue> =>
	Object.freeze(Array.from(values));

const freezeEntries = <TValue>(
	entries: Iterable<readonly [string, TValue]>,
): ReadonlyArray<readonly [string, TValue]> => freezeArray(entries);

const freezeRecord = <TValue>(record: Record<string, TValue>) =>
	Object.freeze({ ...record }) as Readonly<Record<string, TValue>>;

const toFrozenEntries = <TValue>(
	entries: Iterable<readonly [string, TValue]>,
): ReadonlyArray<readonly [string, TValue]> => {
	const frozen: Array<readonly [string, TValue]> = [];
	for (const [key, value] of entries) {
		frozen.push(Object.freeze([key, value] as const));
	}
	return freezeEntries(frozen);
};

const createRegistryDefinitionLookup = <TDefinition extends { id: string }>(
	registry: Registry<TDefinition>,
	definitionType: string,
): DefinitionLookup<TDefinition> => {
	const entries = Array.from(registry.entries()) as Array<
		readonly [string, TDefinition]
	>;
	const record = freezeRecord(Object.fromEntries(entries));
	const frozenEntries = toFrozenEntries(entries);
	const list = freezeArray(Object.values(record));
	const keys = freezeArray(Object.keys(record));
	const lookup: DefinitionLookup<TDefinition> = {
		record,
		get(id: string) {
			if (!registry.has(id)) {
				return undefined;
			}
			return registry.get(id);
		},
		getOrThrow(id: string) {
			if (!registry.has(id)) {
				throw new Error(`Unknown ${definitionType} definition: ${id}`);
			}
			return registry.get(id);
		},
		has(id: string) {
			return registry.has(id);
		},
		entries() {
			return frozenEntries;
		},
		values() {
			return list;
		},
		keys() {
			return keys;
		},
	};
	const frozenLookup = Object.freeze(lookup);
	return frozenLookup;
};

export const createRegistryLookup = <TDefinition extends { id: string }>(
	registry: Registry<TDefinition>,
	definitionType: string,
): DefinitionLookup<TDefinition> =>
	createRegistryDefinitionLookup(registry, definitionType);

const freezeDefinition = <TDefinition>(
	definition: TDefinition,
): TDefinition => {
	if (typeof definition === 'object' && definition !== null) {
		const cloned = clone(definition);
		return Object.freeze(cloned as TDefinition);
	}
	return definition;
};

const createDefinitionRecord = <TDefinition>(
	definitions: Record<string, TDefinition>,
	cloneEntry: (definition: TDefinition) => TDefinition = freezeDefinition,
): Readonly<Record<string, TDefinition>> => {
	const record: Record<string, TDefinition> = {};
	for (const [key, definition] of Object.entries(definitions)) {
		record[key] = cloneEntry(definition);
	}
	return Object.freeze(record);
};

const orderEntries = <TDefinition>(
	record: Readonly<Record<string, TDefinition>>,
	orderedKeys: ReadonlyArray<string> | undefined,
): ReadonlyArray<readonly [string, TDefinition]> => {
	if (!orderedKeys || orderedKeys.length === 0) {
		const baseEntries = Object.entries(record).map((entry) =>
			Object.freeze([entry[0], entry[1]] as const),
		);
		return freezeEntries(baseEntries);
	}
	const entries: Array<readonly [string, TDefinition]> = [];
	const seen = new Set<string>();
	for (const key of orderedKeys) {
		if (!Object.prototype.hasOwnProperty.call(record, key)) {
			continue;
		}
		const definition = record[key]!;
		entries.push(Object.freeze([key, definition] as const));
		seen.add(key);
	}
	for (const [key, definition] of Object.entries(record)) {
		if (seen.has(key)) {
			continue;
		}
		entries.push(Object.freeze([key, definition] as const));
	}
	return freezeEntries(entries);
};

const createRecordLookup = <TDefinition>(
	definitions: Record<string, TDefinition>,
	definitionType: string,
	cloneEntry: (definition: TDefinition) => TDefinition = freezeDefinition,
	orderedKeys?: ReadonlyArray<string>,
): DefinitionLookup<TDefinition> => {
	const record = createDefinitionRecord(definitions, cloneEntry);
	const frozenEntries = orderEntries(record, orderedKeys);
	const values = freezeArray(frozenEntries.map(([, definition]) => definition));
	const keys = freezeArray(frozenEntries.map(([key]) => key));
	const lookup: DefinitionLookup<TDefinition> = {
		record,
		get(id: string) {
			return record[id];
		},
		getOrThrow(id: string) {
			const value = record[id];
			if (!value) {
				throw new Error(`Unknown ${definitionType} definition: ${id}`);
			}
			return value;
		},
		has(id: string) {
			return Object.prototype.hasOwnProperty.call(record, id);
		},
		entries() {
			return frozenEntries;
		},
		values() {
			return values;
		},
		keys() {
			return keys;
		},
	};
	return Object.freeze(lookup);
};

export const createResourceLookup = (
	resources: Record<string, SessionResourceDefinition>,
	orderedKeys?: ReadonlyArray<string>,
): DefinitionLookup<SessionResourceDefinition> =>
	createRecordLookup(resources, 'resource', freezeDefinition, orderedKeys);

export const createFrozenRecordLookup = <TDefinition>(
	definitions: Record<string, TDefinition>,
	definitionType: string,
	orderedKeys?: ReadonlyArray<string>,
): DefinitionLookup<TDefinition> =>
	createRecordLookup(
		definitions,
		definitionType,
		freezeDefinition,
		orderedKeys,
	);

export const createOrderedFrozenRecordLookup = <TDefinition>(
	definitions: Record<string, TDefinition>,
	definitionType: string,
	orderedKeys: ReadonlyArray<string> | undefined,
): DefinitionLookup<TDefinition> =>
	createRecordLookup(
		definitions,
		definitionType,
		freezeDefinition,
		orderedKeys,
	);
