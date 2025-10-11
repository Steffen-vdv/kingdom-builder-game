import type { SessionRegistries } from '../../src/state/sessionRegistries';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import {
	DEFAULT_LAND_DESCRIPTOR,
	DEFAULT_PASSIVE_DESCRIPTOR,
	DEFAULT_SLOT_DESCRIPTOR,
	buildPhaseMetadata,
	buildRegistryMetadata,
	buildResourceMetadata,
	buildStatMetadata,
	buildTriggerMetadata,
	resolveAssetDescriptor,
	type RegistryMetadataDescriptor,
	type PhaseMetadata,
	type TriggerMetadata,
} from '../../src/contexts/registryMetadataDescriptors';
import {
	createAssetMetadataSelector,
	createMetadataSelector,
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
	type AssetMetadataSelector,
	type MetadataSelector,
} from '../../src/contexts/registryMetadataSelectors';

export interface TestRegistryMetadataSelectors {
	resourceMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	populationMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	buildingMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	developmentMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	statMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	phaseMetadata: MetadataSelector<PhaseMetadata>;
	triggerMetadata: MetadataSelector<TriggerMetadata>;
	landMetadata: AssetMetadataSelector;
	slotMetadata: AssetMetadataSelector;
	passiveMetadata: AssetMetadataSelector;
}

export function createTestRegistryMetadata(
	registries: Pick<
		SessionRegistries,
		'resources' | 'populations' | 'buildings' | 'developments'
	>,
	metadata: SessionSnapshotMetadata,
): TestRegistryMetadataSelectors {
	const resourceMetadataLookup = buildResourceMetadata(
		registries.resources,
		extractDescriptorRecord(metadata, 'resources'),
	);
	const populationMetadataLookup = buildRegistryMetadata(
		registries.populations,
		extractDescriptorRecord(metadata, 'populations'),
	);
	const buildingMetadataLookup = buildRegistryMetadata(
		registries.buildings,
		extractDescriptorRecord(metadata, 'buildings'),
	);
	const developmentMetadataLookup = buildRegistryMetadata(
		registries.developments,
		extractDescriptorRecord(metadata, 'developments'),
	);
	const statMetadataLookup = buildStatMetadata(
		extractDescriptorRecord(metadata, 'stats'),
	);
	const phaseMetadataLookup = buildPhaseMetadata(extractPhaseRecord(metadata));
	const triggerMetadataLookup = buildTriggerMetadata(
		extractTriggerRecord(metadata),
	);
	const assetDescriptors = extractDescriptorRecord(metadata, 'assets');
	const landDescriptor = resolveAssetDescriptor(
		'land',
		assetDescriptors?.land,
		DEFAULT_LAND_DESCRIPTOR,
	);
	const slotDescriptor = resolveAssetDescriptor(
		'slot',
		assetDescriptors?.slot,
		DEFAULT_SLOT_DESCRIPTOR,
	);
	const passiveDescriptor = resolveAssetDescriptor(
		'passive',
		assetDescriptors?.passive,
		DEFAULT_PASSIVE_DESCRIPTOR,
	);
	return {
		resourceMetadata: createMetadataSelector(resourceMetadataLookup),
		populationMetadata: createMetadataSelector(populationMetadataLookup),
		buildingMetadata: createMetadataSelector(buildingMetadataLookup),
		developmentMetadata: createMetadataSelector(developmentMetadataLookup),
		statMetadata: createMetadataSelector(statMetadataLookup),
		phaseMetadata: createMetadataSelector(phaseMetadataLookup),
		triggerMetadata: createMetadataSelector(triggerMetadataLookup),
		landMetadata: createAssetMetadataSelector(landDescriptor),
		slotMetadata: createAssetMetadataSelector(slotDescriptor),
		passiveMetadata: createAssetMetadataSelector(passiveDescriptor),
	};
}
