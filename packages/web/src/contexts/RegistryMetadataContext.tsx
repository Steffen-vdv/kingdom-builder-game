import React, { createContext, useContext, useMemo } from 'react';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	Registry,
} from '@kingdom-builder/protocol';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../state/sessionRegistries';

type DefinitionEntries<TDefinition> = ReadonlyArray<
	readonly [string, TDefinition]
>;

type DefinitionLookup<TDefinition> = {
	get(id: string): TDefinition | undefined;
	getOrThrow(id: string): TDefinition;
	has(id: string): boolean;
	entries(): DefinitionEntries<TDefinition>;
	keys(): ReadonlyArray<string>;
	values(): ReadonlyArray<TDefinition>;
};

export interface RegistryMetadataContextValue {
	resources: DefinitionLookup<SessionResourceDefinition>;
	buildings: DefinitionLookup<BuildingConfig>;
	developments: DefinitionLookup<DevelopmentConfig>;
	populations: DefinitionLookup<PopulationConfig>;
}

interface RegistryMetadataProviderProps {
	registries: Pick<
		SessionRegistries,
		'resources' | 'buildings' | 'developments' | 'populations'
	>;
	children: React.ReactNode;
}

const RegistryMetadataContext =
	createContext<RegistryMetadataContextValue | null>(null);

function createLookupFromEntries<TDefinition>(
	entries: DefinitionEntries<TDefinition>,
	kind: string,
): DefinitionLookup<TDefinition> {
	const map = new Map<string, TDefinition>();
	for (const [id, definition] of entries) {
		map.set(id, definition);
	}
	const keys = Object.freeze(Array.from(map.keys()));
	const values = Object.freeze(keys.map((id) => map.get(id) as TDefinition));
	const frozenEntries = Object.freeze(
		keys.map((id, index) => Object.freeze([id, values[index]!] as const)),
	) as DefinitionEntries<TDefinition>;
	return Object.freeze({
		get: (id: string) => map.get(id),
		getOrThrow: (id: string) => {
			const value = map.get(id);
			if (!value) {
				throw new Error(`Missing ${kind} metadata for "${id}".`);
			}
			return value;
		},
		has: (id: string) => map.has(id),
		entries: () => frozenEntries,
		keys: () => keys,
		values: () => values,
	});
}

function createRegistryLookup<TDefinition>(
	registry: Registry<TDefinition>,
	kind: string,
): DefinitionLookup<TDefinition> {
	const pairs = registry
		.entries()
		.map(([id, definition]) => Object.freeze([id, definition] as const));
	return createLookupFromEntries(pairs, kind);
}

function createResourceLookup(
	resources: SessionRegistries['resources'],
): DefinitionLookup<SessionResourceDefinition> {
	const pairs = Object.entries(resources).map(([key, definition]) =>
		Object.freeze([key, definition] as const),
	);
	return createLookupFromEntries(pairs, 'resource');
}

export function RegistryMetadataProvider({
	registries,
	children,
}: RegistryMetadataProviderProps) {
	const resourceLookup = useMemo(
		() => createResourceLookup(registries.resources),
		[registries.resources],
	);
	const buildingLookup = useMemo(
		() =>
			createRegistryLookup<BuildingConfig>(registries.buildings, 'building'),
		[registries.buildings],
	);
	const developmentLookup = useMemo(
		() =>
			createRegistryLookup<DevelopmentConfig>(
				registries.developments,
				'development',
			),
		[registries.developments],
	);
	const populationLookup = useMemo(
		() =>
			createRegistryLookup<PopulationConfig>(
				registries.populations,
				'population',
			),
		[registries.populations],
	);
	const value = useMemo<RegistryMetadataContextValue>(
		() =>
			Object.freeze({
				resources: resourceLookup,
				buildings: buildingLookup,
				developments: developmentLookup,
				populations: populationLookup,
			}),
		[resourceLookup, buildingLookup, developmentLookup, populationLookup],
	);
	return (
		<RegistryMetadataContext.Provider value={value}>
			{children}
		</RegistryMetadataContext.Provider>
	);
}

export function useRegistryMetadata(): RegistryMetadataContextValue {
	const value = useContext(RegistryMetadataContext);
	if (!value) {
		throw new Error(
			'useRegistryMetadata must be used within RegistryMetadataProvider',
		);
	}
	return value;
}
