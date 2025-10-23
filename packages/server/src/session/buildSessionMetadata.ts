import {
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
	POPULATION_INFO,
	POPULATION_ROLES,
	UPKEEP_INFO,
	TRANSFER_INFO,
} from '@kingdom-builder/contents';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PhaseConfig,
	PopulationConfig,
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	Registry,
	SerializedRegistry,
	SessionMetadataDescriptor,
	SessionMetadataSnapshot,
	SessionPhaseMetadata,
	SessionTriggerMetadata,
	SessionResourceDefinition,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
} from '@kingdom-builder/protocol';
import { buildResourceV2Metadata } from './resourceV2MetadataBuilder.js';

type SessionMetadataDescriptorMap = Record<string, SessionMetadataDescriptor>;
type SessionPhaseStep = NonNullable<SessionPhaseMetadata['steps']>[number];

export type SessionStaticMetadataPayload = SessionMetadataSnapshot;

export interface BuildSessionMetadataOptions {
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	resources: SerializedRegistry<SessionResourceDefinition>;
	resourcesV2?: SerializedRegistry<ResourceV2Definition>;
	resourceGroups?: SerializedRegistry<ResourceV2GroupMetadata>;
	phases: ReadonlyArray<PhaseConfig>;
}

export function buildSessionMetadata(
	options: BuildSessionMetadataOptions,
): SessionStaticMetadataPayload {
	const metadata: SessionStaticMetadataPayload = {};
	const legacyResourceDescriptors = buildResourceMetadata(options.resources);
	const resourceV2Metadata = buildResourceV2Metadata(
		options.resourcesV2,
		options.resourceGroups,
	);
	const resourceV2Descriptors = buildResourceV2Descriptors(
		resourceV2Metadata.resourceMetadata,
		resourceV2Metadata.resourceGroups,
	);
	const mergedResourceDescriptors = mergeDescriptorMaps(
		legacyResourceDescriptors,
		resourceV2Descriptors,
	);
	if (hasEntries(mergedResourceDescriptors)) {
		metadata.resources = mergedResourceDescriptors;
	}
	if (hasEntries(resourceV2Metadata.resourceMetadata)) {
		metadata.resourceMetadata = resourceV2Metadata.resourceMetadata;
	}
	if (hasEntries(resourceV2Metadata.resourceGroups)) {
		metadata.resourceGroups = resourceV2Metadata.resourceGroups;
	}
	if (resourceV2Metadata.orderedResourceIds.length > 0) {
		metadata.orderedResourceIds = resourceV2Metadata.orderedResourceIds;
	}
	if (resourceV2Metadata.orderedResourceGroupIds.length > 0) {
		metadata.orderedResourceGroupIds =
			resourceV2Metadata.orderedResourceGroupIds;
	}
	if (hasEntries(resourceV2Metadata.parentIdByResourceId)) {
		metadata.parentIdByResourceId = resourceV2Metadata.parentIdByResourceId;
	}
	const populationMetadata = buildPopulationMetadata(options.populations);
	if (hasEntries(populationMetadata)) {
		metadata.populations = populationMetadata;
	}
	const buildingMetadata = buildRegistryMetadata(options.buildings);
	if (hasEntries(buildingMetadata)) {
		metadata.buildings = buildingMetadata;
	}
	const developmentMetadata = buildRegistryMetadata(options.developments);
	if (hasEntries(developmentMetadata)) {
		metadata.developments = developmentMetadata;
	}
	const statMetadata = buildStatMetadata();
	if (hasEntries(statMetadata)) {
		metadata.stats = statMetadata;
	}
	const phaseMetadata = buildPhaseMetadata(options.phases);
	if (hasEntries(phaseMetadata)) {
		metadata.phases = phaseMetadata;
	}
	const triggerMetadata = buildTriggerMetadata();
	if (hasEntries(triggerMetadata)) {
		metadata.triggers = triggerMetadata;
	}
	const assetMetadata = buildAssetMetadata();
	if (hasEntries(assetMetadata)) {
		metadata.assets = assetMetadata;
	}
	const overviewMetadata = structuredClone(OVERVIEW_CONTENT);
	metadata.overview = overviewMetadata;
	return metadata;
}

function buildResourceMetadata(
	resources: SerializedRegistry<SessionResourceDefinition>,
): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	for (const key of Object.keys(resources)) {
		const definition = resources[key];
		if (!definition) {
			continue;
		}
		const descriptor: SessionMetadataDescriptor = {};
		if (definition.label) {
			descriptor.label = definition.label;
		}
		if (definition.icon) {
			descriptor.icon = definition.icon;
		}
		if (definition.description) {
			descriptor.description = definition.description;
		}
		descriptors[key] = descriptor;
	}
	return descriptors;
}

function buildResourceV2Descriptors(
	resources: Record<string, SessionResourceV2MetadataSnapshot>,
	groups: Record<string, SessionResourceV2GroupSnapshot>,
): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	for (const descriptor of Object.values(resources)) {
		const entry: SessionMetadataDescriptor = { label: descriptor.name };
		if (descriptor.icon) {
			entry.icon = descriptor.icon;
		}
		if (descriptor.description) {
			entry.description = descriptor.description;
		}
		if (descriptor.isPercent) {
			entry.displayAsPercent = true;
		}
		descriptors[descriptor.id] = entry;
	}
	for (const group of Object.values(groups)) {
		const parent = group.parent;
		if (!parent) {
			continue;
		}
		const parentDescriptor: SessionMetadataDescriptor = {
			label: parent.name,
		};
		if (parent.icon) {
			parentDescriptor.icon = parent.icon;
		}
		if (parent.description) {
			parentDescriptor.description = parent.description;
		}
		if (parent.isPercent) {
			parentDescriptor.displayAsPercent = true;
		}
		descriptors[parent.id] = parentDescriptor;
	}
	return descriptors;
}

function buildRegistryMetadata<
	Definition extends {
		name: string;
		icon?: string | undefined;
		description?: string | undefined;
	},
>(registry: Registry<Definition>): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	for (const [id, definition] of registry.entries()) {
		const descriptor: SessionMetadataDescriptor = { label: definition.name };
		if (definition.icon) {
			descriptor.icon = definition.icon;
		}
		if (definition.description) {
			descriptor.description = definition.description;
		}
		descriptors[id] = descriptor;
	}
	return descriptors;
}

function buildPopulationMetadata(
	registry: Registry<PopulationConfig>,
): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	for (const [id, definition] of registry.entries()) {
		const descriptor: SessionMetadataDescriptor = { label: definition.name };
		if (definition.icon) {
			descriptor.icon = definition.icon;
		}
		const description = (definition as { description?: string }).description;
		if (description) {
			descriptor.description = description;
		} else {
			const roleInfo = POPULATION_ROLES[id as keyof typeof POPULATION_ROLES];
			if (roleInfo?.description) {
				descriptor.description = roleInfo.description;
			}
		}
		descriptors[id] = descriptor;
	}
	return descriptors;
}

function buildStatMetadata(): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	const statKeys = Object.keys(STATS) as Array<keyof typeof STATS>;
	for (const key of statKeys) {
		const info = STATS[key];
		const descriptor: SessionMetadataDescriptor = {
			label: info.label,
			description: info.description,
		};
		if (info.icon) {
			descriptor.icon = info.icon;
		}
		if (info.displayAsPercent) {
			descriptor.displayAsPercent = info.displayAsPercent;
		}
		if (info.addFormat) {
			descriptor.format = { ...info.addFormat };
		}
		descriptors[key] = descriptor;
	}
	return descriptors;
}

function buildPhaseMetadata(
	phases: ReadonlyArray<PhaseConfig>,
): Record<string, SessionPhaseMetadata> {
	const descriptors: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		const descriptor: SessionPhaseMetadata = { id: phase.id };
		if (phase.label) {
			descriptor.label = phase.label;
		}
		if (phase.icon) {
			descriptor.icon = phase.icon;
		}
		if (phase.action) {
			descriptor.action = true;
		}
		const steps: SessionPhaseStep[] = phase.steps.map((step) => {
			const stepMetadata: SessionPhaseStep = { id: step.id };
			if (step.title) {
				stepMetadata.label = step.title;
			}
			if (step.icon) {
				stepMetadata.icon = step.icon;
			}
			if (step.triggers && step.triggers.length > 0) {
				stepMetadata.triggers = [...step.triggers];
			}
			return stepMetadata;
		});
		if (steps.length > 0) {
			descriptor.steps = steps;
		}
		descriptors[phase.id] = descriptor;
	}
	return descriptors;
}

function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const descriptors: Record<string, SessionTriggerMetadata> = {};
	const triggerKeys = Object.keys(TRIGGER_INFO) as Array<
		keyof typeof TRIGGER_INFO
	>;
	for (const key of triggerKeys) {
		descriptors[key] = buildTriggerDescriptor(TRIGGER_INFO[key]);
	}
	return descriptors;
}

function buildTriggerDescriptor(
	info: (typeof TRIGGER_INFO)[keyof typeof TRIGGER_INFO],
): SessionTriggerMetadata {
	const descriptor: SessionTriggerMetadata = {};
	if (info.icon) {
		descriptor.icon = info.icon;
	}
	if (info.future) {
		descriptor.future = info.future;
	}
	if (info.past) {
		descriptor.past = info.past;
	}
	return descriptor;
}

function buildAssetMetadata(): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	assignAssetDescriptor(descriptors, 'population', POPULATION_INFO);
	assignAssetDescriptor(descriptors, 'passive', PASSIVE_INFO);
	assignAssetDescriptor(descriptors, 'land', LAND_INFO);
	assignAssetDescriptor(descriptors, 'slot', SLOT_INFO);
	assignAssetDescriptor(descriptors, 'upkeep', UPKEEP_INFO);
	assignAssetDescriptor(descriptors, 'transfer', TRANSFER_INFO);
	return descriptors;
}

type AssetInfo = { icon?: string; label?: string; description?: string };

function assignAssetDescriptor(
	target: SessionMetadataDescriptorMap,
	key: string,
	info: AssetInfo | undefined,
): void {
	if (!info) {
		return;
	}
	const descriptor: SessionMetadataDescriptor = {};
	if (info.label) {
		descriptor.label = info.label;
	}
	if (info.icon) {
		descriptor.icon = info.icon;
	}
	if (info.description) {
		descriptor.description = info.description;
	}
	target[key] = descriptor;
}

function hasEntries<T>(value: Record<string, T>): boolean {
	return Object.keys(value).length > 0;
}

function mergeDescriptorMaps(
	...maps: ReadonlyArray<SessionMetadataDescriptorMap>
): SessionMetadataDescriptorMap {
	const merged: SessionMetadataDescriptorMap = {};
	for (const map of maps) {
		for (const [id, descriptor] of Object.entries(map)) {
			merged[id] = descriptor;
		}
	}
	return merged;
}
