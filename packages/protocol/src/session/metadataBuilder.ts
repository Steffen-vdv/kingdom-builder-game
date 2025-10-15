import type {
	SessionMetadataDescriptor,
	SessionPassiveEvaluationModifierMap,
	SessionPhaseMetadata,
	SessionSnapshotMetadata,
	SessionSnapshotMetadataAssets,
	SessionTriggerMetadata,
} from './index';
import type { OverviewContentTemplate } from './overview';
import { buildOverviewMetadata } from './metadataOverview';

export interface MetadataDescriptorSource {
	readonly label?: string;
	readonly icon?: string;
	readonly description?: string;
}

export interface MetadataRegistryEntrySource extends MetadataDescriptorSource {
	readonly name?: string;
}

export type MetadataRegistrySource = Record<
	string,
	MetadataRegistryEntrySource
>;

export interface MetadataResourceSource extends MetadataDescriptorSource {
	readonly tags?: readonly string[] | string[];
}

export interface MetadataPhaseStepSource {
	readonly id: string;
	readonly title?: string;
	readonly icon?: string;
	readonly triggers?: readonly string[] | string[];
}

export interface MetadataPhaseSource extends MetadataDescriptorSource {
	readonly id: string;
	readonly action?: boolean;
	readonly steps?: readonly MetadataPhaseStepSource[];
}

export interface MetadataTriggerSource extends MetadataDescriptorSource {
	readonly future?: string;
	readonly past?: string;
}

export type MetadataAssetEntry =
	| MetadataDescriptorSource
	| Record<string, MetadataDescriptorSource | undefined>;

export type MetadataAssetSources = Record<
	string,
	MetadataAssetEntry | undefined
>;

export interface MetadataRegistrySources {
	readonly populations?: MetadataRegistrySource;
	readonly buildings?: MetadataRegistrySource;
	readonly developments?: MetadataRegistrySource;
}

export interface MetadataContentSources {
	readonly resources?: Record<string, MetadataResourceSource>;
	readonly stats?: Record<string, MetadataDescriptorSource>;
	readonly phases?: readonly MetadataPhaseSource[];
	readonly triggers?: Record<string, MetadataTriggerSource>;
	readonly assets?: MetadataAssetSources;
	readonly overview?: OverviewContentTemplate;
}

export interface BuildSessionSnapshotMetadataOptions {
	readonly registries?: MetadataRegistrySources;
	readonly content?: MetadataContentSources;
	readonly passiveEvaluationModifiers?: SessionPassiveEvaluationModifierMap;
}

const createDescriptor = (
	label?: string,
	icon?: string,
	description?: string,
): SessionMetadataDescriptor => {
	const descriptor: SessionMetadataDescriptor = {};
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (description !== undefined) {
		descriptor.description = description;
	}
	return descriptor;
};

const buildRegistryDescriptorMap = (
	registry?: MetadataRegistrySource,
): Record<string, SessionMetadataDescriptor> | undefined => {
	if (!registry) {
		return undefined;
	}
	const entries: Array<readonly [string, SessionMetadataDescriptor]> = [];
	for (const [id, definition] of Object.entries(registry)) {
		const label = definition.name ?? definition.label;
		entries.push([
			id,
			createDescriptor(label, definition.icon, definition.description),
		]);
	}
	return Object.fromEntries(entries);
};

const buildDescriptorMap = (
	entries?: Record<string, MetadataDescriptorSource>,
): Record<string, SessionMetadataDescriptor> | undefined => {
	if (!entries) {
		return undefined;
	}
	return Object.fromEntries(
		Object.entries(entries).map(([id, descriptor]) => [
			id,
			createDescriptor(
				descriptor.label,
				descriptor.icon,
				descriptor.description,
			),
		]),
	);
};

const buildResourceMetadata = (
	resources?: Record<string, MetadataResourceSource>,
): Record<string, SessionMetadataDescriptor> | undefined => {
	if (!resources) {
		return undefined;
	}
	return Object.fromEntries(
		Object.entries(resources).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);
};

const buildPhaseMetadata = (
	phases?: readonly MetadataPhaseSource[],
): Record<string, SessionPhaseMetadata> | undefined => {
	if (!phases) {
		return undefined;
	}
	const entries: Array<readonly [string, SessionPhaseMetadata]> = [];
	for (const phase of phases) {
		const steps = phase.steps?.map(
			(step): SessionPhaseMetadata['steps'][number] => {
				const clonedStep: SessionPhaseMetadata['steps'][number] = {
					id: step.id,
				};
				if (step.title !== undefined) {
					clonedStep.label = step.title;
				}
				if (step.icon !== undefined) {
					clonedStep.icon = step.icon;
				}
				if (step.triggers && step.triggers.length > 0) {
					clonedStep.triggers = [...step.triggers];
				}
				return clonedStep;
			},
		);
		const descriptor: SessionPhaseMetadata = { id: phase.id };
		if (phase.label !== undefined) {
			descriptor.label = phase.label;
		}
		if (phase.icon !== undefined) {
			descriptor.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			descriptor.action = phase.action;
		}
		if (steps && steps.length > 0) {
			descriptor.steps = steps;
		}
		entries.push([phase.id, descriptor]);
	}
	return Object.fromEntries(entries);
};

const buildTriggerMetadata = (
	triggers?: Record<string, MetadataTriggerSource>,
): Record<string, SessionTriggerMetadata> | undefined => {
	if (!triggers) {
		return undefined;
	}
	return Object.fromEntries(
		Object.entries(triggers).map(([id, info]) => [
			id,
			{
				label: info.past,
				icon: info.icon,
				future: info.future,
				past: info.past,
			},
		]),
	);
};

const isNestedAssetEntry = (
	entry: MetadataAssetEntry,
): entry is Record<string, MetadataDescriptorSource | undefined> => {
	if (!entry || typeof entry !== 'object') {
		return false;
	}
	if ('label' in entry || 'icon' in entry || 'description' in entry) {
		return false;
	}
	return true;
};

const buildAssetMetadata = (
	assets?: MetadataAssetSources,
): SessionSnapshotMetadataAssets | undefined => {
	if (!assets) {
		return undefined;
	}
	const entries: Array<
		readonly [
			string,
			SessionMetadataDescriptor | Record<string, SessionMetadataDescriptor>,
		]
	> = [];
	for (const [assetId, entry] of Object.entries(assets)) {
		if (!entry) {
			continue;
		}
		if (isNestedAssetEntry(entry)) {
			const nested = Object.fromEntries(
				Object.entries(entry)
					.filter(([, descriptor]) => descriptor !== undefined)
					.map(([id, descriptor]) => [
						id,
						createDescriptor(
							descriptor?.label,
							descriptor?.icon,
							descriptor?.description,
						),
					]),
			);
			entries.push([assetId, nested]);
			continue;
		}
		entries.push([
			assetId,
			createDescriptor(entry.label, entry.icon, entry.description),
		]);
	}
	return Object.fromEntries(entries) as SessionSnapshotMetadataAssets;
};

export function buildSessionSnapshotMetadata({
	registries,
	content,
	passiveEvaluationModifiers = {},
}: BuildSessionSnapshotMetadataOptions): SessionSnapshotMetadata {
	const populations = buildRegistryDescriptorMap(registries?.populations);
	const buildings = buildRegistryDescriptorMap(registries?.buildings);
	const developments = buildRegistryDescriptorMap(registries?.developments);
	const resources = buildResourceMetadata(content?.resources) ?? {};
	const stats = buildDescriptorMap(content?.stats) ?? {};
	const phases = buildPhaseMetadata(content?.phases) ?? {};
	const triggers = buildTriggerMetadata(content?.triggers) ?? {};
	const assets = buildAssetMetadata(content?.assets);
	const overview = buildOverviewMetadata(content?.overview);
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers,
	};
	if (Object.keys(resources).length > 0) {
		metadata.resources = resources;
	}
	if (populations) {
		metadata.populations = populations;
	}
	if (buildings) {
		metadata.buildings = buildings;
	}
	if (developments) {
		metadata.developments = developments;
	}
	if (Object.keys(stats).length > 0) {
		metadata.stats = stats;
	}
	if (Object.keys(phases).length > 0) {
		metadata.phases = phases;
	}
	if (Object.keys(triggers).length > 0) {
		metadata.triggers = triggers;
	}
	if (assets && Object.keys(assets).length > 0) {
		metadata.assets = assets;
	}
	if (overview) {
		metadata.overview = overview;
	}
	return metadata;
}
