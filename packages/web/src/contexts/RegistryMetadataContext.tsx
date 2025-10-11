import React, { createContext, useContext, useMemo } from 'react';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
} from '@kingdom-builder/protocol';
// prettier-ignore
import type {
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../state/sessionRegistries';

type MetadataEntry<Definition> = readonly [string, Definition];

type MetadataAccessor<Definition> = {
	get(id: string): Definition | undefined;
	require(id: string): Definition;
	has(id: string): boolean;
	entries(): readonly MetadataEntry<Definition>[];
	keys(): readonly string[];
	values(): readonly Definition[];
};

interface RegistryMetadataContextValue {
	readonly resources: MetadataAccessor<SessionResourceDefinition>;
	readonly buildings: MetadataAccessor<BuildingConfig>;
	readonly developments: MetadataAccessor<DevelopmentConfig>;
	readonly populations: MetadataAccessor<PopulationConfig>;
}

const MISSING_CONTEXT_MESSAGE = [
	'useRegistryMetadata must be used within',
	'RegistryMetadataProvider',
].join(' ');

export interface RegistryMetadataProviderProps {
	registries: Pick<
		SessionRegistries,
		'buildings' | 'developments' | 'populations' | 'resources'
	>;
	children: React.ReactNode;
}

function toReadonlyArray<Item>(items: Item[]): readonly Item[] {
	return Object.freeze(items.slice());
}

function createEntries<Definition>(
	entries: Iterable<[string, Definition]>,
): readonly MetadataEntry<Definition>[] {
	const mapped: MetadataEntry<Definition>[] = [];
	for (const [id, definition] of entries) {
		mapped.push([id, definition] as const);
	}
	return toReadonlyArray(mapped);
}

function createMetadataAccessor<Definition>(
	entries: readonly MetadataEntry<Definition>[],
	kind: string,
): MetadataAccessor<Definition> {
	const map = new Map(entries);
	const keys = toReadonlyArray(entries.map(([id]) => id));
	const mappedValues = entries.map(([, definition]) => definition);
	const values = toReadonlyArray(mappedValues);
	return {
		get: (id) => map.get(id),
		require: (id) => {
			const definition = map.get(id);
			if (!definition) {
				throw new Error(`Unknown ${kind}: ${id}`);
			}
			return definition;
		},
		has: (id) => map.has(id),
		entries: () => entries,
		keys: () => keys,
		values: () => values,
	};
}

function createRegistryAccessor<Definition>(
	registry: { entries(): [string, Definition][] },
	kind: string,
): MetadataAccessor<Definition> {
	return createMetadataAccessor(createEntries(registry.entries()), kind);
}

function createResourceAccessor(
	resources: Record<string, SessionResourceDefinition>,
): MetadataAccessor<SessionResourceDefinition> {
	return createMetadataAccessor(
		createEntries(Object.entries(resources)),
		'resource',
	);
}

const RegistryMetadataContext =
	createContext<RegistryMetadataContextValue | null>(null);

export const RegistryMetadataProvider: React.FC<
	RegistryMetadataProviderProps
> = ({ registries, children }) => {
	const value = useMemo<RegistryMetadataContextValue>(() => {
		const buildings = registries.buildings;
		const developments = registries.developments;
		const populations = registries.populations;
		const resources = registries.resources;
		const resourceMetadata = createResourceAccessor(resources);
		// prettier-ignore
		const buildingMetadata = createRegistryAccessor(
			buildings,
			'building',
		);
		const developmentMetadata = createRegistryAccessor(
			developments,
			'development',
		);
		const populationMetadata = createRegistryAccessor(
			populations,
			'population',
		);
		return {
			resources: resourceMetadata,
			buildings: buildingMetadata,
			developments: developmentMetadata,
			populations: populationMetadata,
		};
	}, [
		registries.buildings,
		registries.developments,
		registries.populations,
		registries.resources,
	]);

	return (
		<RegistryMetadataContext.Provider value={value}>
			{children}
		</RegistryMetadataContext.Provider>
	);
};

export function useRegistryMetadata(): RegistryMetadataContextValue {
	const context = useContext(RegistryMetadataContext);
	if (!context) {
		throw new Error(MISSING_CONTEXT_MESSAGE);
	}
	return context;
}

// prettier-ignore
export function useOptionalRegistryMetadata():
	| RegistryMetadataContextValue
	| null {
	return useContext(RegistryMetadataContext);
}
