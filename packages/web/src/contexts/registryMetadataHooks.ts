import { useMemo } from 'react';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../state/sessionRegistries';
import {
	createRegistryLookup,
	createResourceLookup,
} from './registryMetadataLookups';
import {
	buildPhaseMetadata,
	buildRegistryMetadata,
	buildResourceMetadata,
	buildStatMetadata,
	buildTriggerMetadata,
} from './registryMetadataDescriptors';
import {
	DEFAULT_ASSET_METADATA,
	DEFAULT_BUILDING_METADATA,
	DEFAULT_DEVELOPMENT_METADATA,
	DEFAULT_PHASE_METADATA,
	DEFAULT_POPULATION_METADATA,
	DEFAULT_RESOURCE_METADATA,
	DEFAULT_STAT_METADATA,
	DEFAULT_TRIGGER_METADATA,
	mergeDescriptorRecords,
} from './registryMetadataDefaults';
import {
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
} from './registryMetadataSelectors';

export interface DescriptorOverrides {
	readonly resources?: ReturnType<typeof extractDescriptorRecord>;
	readonly populations?: ReturnType<typeof extractDescriptorRecord>;
	readonly buildings?: ReturnType<typeof extractDescriptorRecord>;
	readonly developments?: ReturnType<typeof extractDescriptorRecord>;
	readonly stats?: ReturnType<typeof extractDescriptorRecord>;
	readonly assets?: ReturnType<typeof extractDescriptorRecord>;
	readonly phases?: ReturnType<typeof extractPhaseRecord>;
	readonly triggers?: ReturnType<typeof extractTriggerRecord>;
}

const EMPTY_DESCRIPTOR_OVERRIDES: DescriptorOverrides = Object.freeze({});

export const useDescriptorOverrides = (
	snapshotMetadata: SessionSnapshotMetadata | null,
): DescriptorOverrides =>
	useMemo(() => {
		if (!snapshotMetadata) {
			return EMPTY_DESCRIPTOR_OVERRIDES;
		}
		return Object.freeze({
			resources: extractDescriptorRecord(snapshotMetadata, 'resources'),
			populations: extractDescriptorRecord(snapshotMetadata, 'populations'),
			buildings: extractDescriptorRecord(snapshotMetadata, 'buildings'),
			developments: extractDescriptorRecord(snapshotMetadata, 'developments'),
			stats: extractDescriptorRecord(snapshotMetadata, 'stats'),
			assets: extractDescriptorRecord(snapshotMetadata, 'assets'),
			phases: extractPhaseRecord(snapshotMetadata),
			triggers: extractTriggerRecord(snapshotMetadata),
		});
	}, [snapshotMetadata]);

interface DefinitionLookups {
	readonly resourceLookup: ReturnType<typeof createResourceLookup>;
	readonly actionLookup: ReturnType<typeof createRegistryLookup>;
	readonly buildingLookup: ReturnType<typeof createRegistryLookup>;
	readonly developmentLookup: ReturnType<typeof createRegistryLookup>;
	readonly populationLookup: ReturnType<typeof createRegistryLookup>;
}

export const useDefinitionLookups = (
	registries: Pick<
		SessionRegistries,
		'actions' | 'resources' | 'buildings' | 'developments' | 'populations'
	>,
): DefinitionLookups =>
	useMemo(() => {
		const resourceLookup = createResourceLookup(registries.resources);
		const actionLookup = createRegistryLookup(registries.actions, 'action');
		const buildingLookup = createRegistryLookup(
			registries.buildings,
			'building',
		);
		const developmentLookup = createRegistryLookup(
			registries.developments,
			'development',
		);
		const populationLookup = createRegistryLookup(
			registries.populations,
			'population',
		);
		return Object.freeze({
			resourceLookup,
			actionLookup,
			buildingLookup,
			developmentLookup,
			populationLookup,
		});
	}, [
		registries.actions,
		registries.buildings,
		registries.developments,
		registries.populations,
		registries.resources,
	]);

interface MetadataLookups {
	readonly resourceMetadataLookup: ReturnType<typeof buildResourceMetadata>;
	readonly populationMetadataLookup: ReturnType<typeof buildRegistryMetadata>;
	readonly buildingMetadataLookup: ReturnType<typeof buildRegistryMetadata>;
	readonly developmentMetadataLookup: ReturnType<typeof buildRegistryMetadata>;
	readonly statMetadataLookup: ReturnType<typeof buildStatMetadata>;
	readonly phaseMetadataLookup: ReturnType<typeof buildPhaseMetadata>;
	readonly triggerMetadataLookup: ReturnType<typeof buildTriggerMetadata>;
	readonly assetDescriptors: ReturnType<typeof mergeDescriptorRecords>;
}

export const useMetadataLookups = (
	registries: Pick<
		SessionRegistries,
		'actions' | 'resources' | 'buildings' | 'developments' | 'populations'
	>,
	overrides: DescriptorOverrides,
): MetadataLookups =>
	useMemo(() => {
		const resourceMetadataLookup = buildResourceMetadata(
			registries.resources,
			mergeDescriptorRecords(DEFAULT_RESOURCE_METADATA, overrides.resources),
		);
		const populationMetadataLookup = buildRegistryMetadata(
			registries.populations,
			mergeDescriptorRecords(
				DEFAULT_POPULATION_METADATA,
				overrides.populations,
			),
		);
		const buildingMetadataLookup = buildRegistryMetadata(
			registries.buildings,
			mergeDescriptorRecords(DEFAULT_BUILDING_METADATA, overrides.buildings),
		);
		const developmentMetadataLookup = buildRegistryMetadata(
			registries.developments,
			mergeDescriptorRecords(
				DEFAULT_DEVELOPMENT_METADATA,
				overrides.developments,
			),
		);
		const statMetadataLookup = buildStatMetadata(
			mergeDescriptorRecords(DEFAULT_STAT_METADATA, overrides.stats),
		);
		const phaseMetadataLookup = buildPhaseMetadata(
			mergeDescriptorRecords(DEFAULT_PHASE_METADATA, overrides.phases),
		);
		const triggerMetadataLookup = buildTriggerMetadata(
			mergeDescriptorRecords(DEFAULT_TRIGGER_METADATA, overrides.triggers),
		);
		const assetDescriptors = mergeDescriptorRecords(
			DEFAULT_ASSET_METADATA,
			overrides.assets,
		);
		return Object.freeze({
			resourceMetadataLookup,
			populationMetadataLookup,
			buildingMetadataLookup,
			developmentMetadataLookup,
			statMetadataLookup,
			phaseMetadataLookup,
			triggerMetadataLookup,
			assetDescriptors,
		});
	}, [
		overrides,
		registries.buildings,
		registries.developments,
		registries.populations,
		registries.resources,
	]);
