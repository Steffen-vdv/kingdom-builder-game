import type { BuildingConfig } from '@kingdom-builder/protocol';
import {
	DEFAULT_REGISTRIES,
	DEFAULT_REGISTRY_METADATA,
} from '../../../../contexts/defaultRegistryMetadata';
import {
	createRegistryLookup,
	createResourceLookup,
	type DefinitionLookup,
} from '../../../../contexts/registryMetadataLookups';
import {
	buildRegistryMetadata,
	buildResourceMetadata,
	buildStatMetadata,
	type MetadataLookup,
	type RegistryMetadataDescriptor,
} from '../../../../contexts/registryMetadataDescriptors';

export type AttackRegistryDescriptor = { icon: string; label: string };

interface AttackRegistryConfig {
	readonly resources: MetadataLookup<RegistryMetadataDescriptor>;
	readonly stats: MetadataLookup<RegistryMetadataDescriptor>;
	readonly buildings: MetadataLookup<RegistryMetadataDescriptor>;
	readonly buildingDefinitions: DefinitionLookup<BuildingConfig>;
}

const freezeConfig = (config: AttackRegistryConfig): AttackRegistryConfig =>
	Object.freeze({
		resources: config.resources,
		stats: config.stats,
		buildings: config.buildings,
		buildingDefinitions: config.buildingDefinitions,
	});

const createDefaultConfig = (): AttackRegistryConfig => {
	const defaultResourceLookup = createResourceLookup(
		DEFAULT_REGISTRIES.resources,
	);
	const defaultBuildingLookup = createRegistryLookup(
		DEFAULT_REGISTRIES.buildings,
		'building',
	);
	return freezeConfig({
		resources: buildResourceMetadata(
			DEFAULT_REGISTRIES.resources,
			DEFAULT_REGISTRY_METADATA.resources,
		),
		stats: buildStatMetadata(DEFAULT_REGISTRY_METADATA.stats),
		buildings: buildRegistryMetadata(
			DEFAULT_REGISTRIES.buildings,
			DEFAULT_REGISTRY_METADATA.buildings,
		),
		buildingDefinitions: defaultBuildingLookup,
	});
};

let registryConfig: AttackRegistryConfig = createDefaultConfig();

export const configureAttackRegistry = (config: AttackRegistryConfig): void => {
	registryConfig = freezeConfig(config);
};

const getRegistryConfig = (): AttackRegistryConfig => registryConfig;

const toDescriptor = (
	descriptor: RegistryMetadataDescriptor,
	fallback: string,
): AttackRegistryDescriptor => ({
	icon: descriptor.icon ?? '',
	label: descriptor.label ?? fallback,
});

export const selectAttackResourceDescriptor = (
	resourceKey: string,
): AttackRegistryDescriptor => {
	const { resources } = getRegistryConfig();
	const descriptor = resources.get(resourceKey);
	return toDescriptor(descriptor, resourceKey);
};

export const selectAttackStatDescriptor = (
	statKey: string,
): AttackRegistryDescriptor => {
	const { stats } = getRegistryConfig();
	const descriptor = stats.get(statKey);
	return toDescriptor(descriptor, statKey);
};

export const selectAttackBuildingDescriptor = (
	buildingId: string,
): AttackRegistryDescriptor => {
	const { buildings } = getRegistryConfig();
	const descriptor = buildings.get(buildingId);
	return toDescriptor(descriptor, buildingId);
};

export const listAttackResourceKeys = (): ReadonlyArray<string> => {
	const { resources } = getRegistryConfig();
	return Object.freeze(resources.values().map((entry) => entry.id));
};

export const listAttackStatKeys = (): ReadonlyArray<string> => {
	const { stats } = getRegistryConfig();
	return Object.freeze(stats.values().map((entry) => entry.id));
};

export const listAttackBuildingIds = (): ReadonlyArray<string> => {
	const { buildingDefinitions } = getRegistryConfig();
	return buildingDefinitions.keys();
};

export const selectAttackDefaultStatKey = (): string | undefined => {
	const keys = listAttackStatKeys();
	return keys.length > 0 ? keys[0] : undefined;
};

export const selectAttackDefaultBuildingId = (): string | undefined => {
	const ids = listAttackBuildingIds();
	return ids.length > 0 ? ids[0] : undefined;
};

export type { AttackRegistryConfig };
