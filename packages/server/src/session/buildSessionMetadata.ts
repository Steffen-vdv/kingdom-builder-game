import type {
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import {
	buildAssetMetadata,
	buildPhaseMetadata,
	buildRegistryDescriptorMap,
	buildResourceMetadata,
	buildStatMetadata,
	buildTriggerMetadata,
} from './metadataBuilders.js';
import {
	mergeDescriptorRecords,
	mergePhaseMetadataRecords,
	mergeTriggerMetadataRecords,
} from './metadataMergers.js';

export interface SessionMetadataBuilderOptions {
	metadata: SessionSnapshotMetadata;
	registries: SessionRegistriesPayload;
}

export function buildSessionMetadata(
	options: SessionMetadataBuilderOptions,
): SessionSnapshotMetadata {
	const { metadata, registries } = options;
	const baseMetadata = structuredClone(metadata);
	const result: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: structuredClone(
			metadata.passiveEvaluationModifiers,
		),
	};
	if (baseMetadata.effectLogs) {
		result.effectLogs = structuredClone(baseMetadata.effectLogs);
	}
	const resources = mergeDescriptorRecords(
		buildResourceMetadata(registries.resources),
		baseMetadata.resources,
	);
	if (Object.keys(resources).length > 0) {
		result.resources = resources;
	}
	const populations = mergeDescriptorRecords(
		buildRegistryDescriptorMap(registries.populations),
		baseMetadata.populations,
	);
	if (Object.keys(populations).length > 0) {
		result.populations = populations;
	}
	const buildings = mergeDescriptorRecords(
		buildRegistryDescriptorMap(registries.buildings),
		baseMetadata.buildings,
	);
	if (Object.keys(buildings).length > 0) {
		result.buildings = buildings;
	}
	const developments = mergeDescriptorRecords(
		buildRegistryDescriptorMap(registries.developments),
		baseMetadata.developments,
	);
	if (Object.keys(developments).length > 0) {
		result.developments = developments;
	}
	const stats = mergeDescriptorRecords(buildStatMetadata(), baseMetadata.stats);
	if (Object.keys(stats).length > 0) {
		result.stats = stats;
	}
	const phases = mergePhaseMetadataRecords(
		buildPhaseMetadata(),
		baseMetadata.phases,
	);
	if (Object.keys(phases).length > 0) {
		result.phases = phases;
	}
	const triggers = mergeTriggerMetadataRecords(
		buildTriggerMetadata(),
		baseMetadata.triggers,
	);
	if (Object.keys(triggers).length > 0) {
		result.triggers = triggers;
	}
	const assets = mergeDescriptorRecords(
		buildAssetMetadata(),
		baseMetadata.assets,
	);
	if (Object.keys(assets).length > 0) {
		result.assets = assets;
	}
	return result;
}
