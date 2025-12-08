import type { SessionRegistries } from '../../src/state/sessionRegistries';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import {
	buildPhaseMetadata,
	buildRegistryMetadata,
	buildResourceMetadata,
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
		'resources' | 'buildings' | 'developments'
	>,
	metadata: SessionSnapshotMetadata,
): TestRegistryMetadataSelectors {
	const resourceMetadataLookup = buildResourceMetadata(
		registries.resources,
		extractDescriptorRecord(metadata, 'resources'),
	);
	const buildingMetadataLookup = buildRegistryMetadata(
		registries.buildings,
		extractDescriptorRecord(metadata, 'buildings'),
	);
	const developmentMetadataLookup = buildRegistryMetadata(
		registries.developments,
		extractDescriptorRecord(metadata, 'developments'),
	);
	const phaseMetadataLookup = buildPhaseMetadata(extractPhaseRecord(metadata));
	const triggerMetadataLookup = buildTriggerMetadata(
		extractTriggerRecord(metadata),
	);
	const assetDescriptors = extractDescriptorRecord(metadata, 'assets');
	const landDescriptor = resolveAssetDescriptor('land', assetDescriptors?.land);
	const slotDescriptor = resolveAssetDescriptor('slot', assetDescriptors?.slot);
	const passiveDescriptor = resolveAssetDescriptor(
		'passive',
		assetDescriptors?.passive,
	);
	// Resources now includes stats and populations under ResourceV2
	const resourceSelector = createMetadataSelector(resourceMetadataLookup);
	return {
		resourceMetadata: resourceSelector,
		populationMetadata: resourceSelector,
		buildingMetadata: createMetadataSelector(buildingMetadataLookup),
		developmentMetadata: createMetadataSelector(developmentMetadataLookup),
		statMetadata: resourceSelector,
		phaseMetadata: createMetadataSelector(phaseMetadataLookup),
		triggerMetadata: createMetadataSelector(triggerMetadataLookup),
		landMetadata: createAssetMetadataSelector(landDescriptor),
		slotMetadata: createAssetMetadataSelector(slotDescriptor),
		passiveMetadata: createAssetMetadataSelector(passiveDescriptor),
	};
}
