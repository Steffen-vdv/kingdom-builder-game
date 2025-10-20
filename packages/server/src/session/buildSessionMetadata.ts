import {
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
	POPULATION_ROLES,
	POPULATION_INFO,
	DEVELOPMENTS_INFO,
	PhaseId,
} from '@kingdom-builder/contents';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PhaseConfig,
	PopulationConfig,
	Registry,
	SerializedRegistry,
	SessionMetadataDescriptor,
	SessionMetadataSnapshot,
	SessionPhaseMetadata,
	SessionTriggerMetadata,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol';

type SessionMetadataDescriptorMap = Record<string, SessionMetadataDescriptor>;
type SessionPhaseStep = NonNullable<SessionPhaseMetadata['steps']>[number];

export type SessionStaticMetadataPayload = SessionMetadataSnapshot;

export interface BuildSessionMetadataOptions {
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	resources: SerializedRegistry<SessionResourceDefinition>;
	phases: ReadonlyArray<PhaseConfig>;
}

export function buildSessionMetadata(
	options: BuildSessionMetadataOptions,
): SessionStaticMetadataPayload {
	const metadata: SessionStaticMetadataPayload = {};
	const resourceMetadata = buildResourceMetadata(options.resources);
	if (hasEntries(resourceMetadata)) {
		metadata.resources = resourceMetadata;
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
	const assetMetadata = buildAssetMetadata(options.phases);
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

function buildAssetMetadata(
	phases: ReadonlyArray<PhaseConfig>,
): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	assignAssetDescriptor(descriptors, 'passive', PASSIVE_INFO);
	assignAssetDescriptor(descriptors, 'land', LAND_INFO);
	assignAssetDescriptor(descriptors, 'slot', SLOT_INFO);
	assignAssetDescriptor(descriptors, 'population', POPULATION_INFO);
	assignAssetDescriptor(descriptors, 'developments', DEVELOPMENTS_INFO);
	const upkeepPhase = phases.find((phase) => phase.id === PhaseId.Upkeep);
	if (upkeepPhase) {
		const upkeepDescriptor: AssetInfo = {};
		if (typeof upkeepPhase.label === 'string') {
			upkeepDescriptor.label = upkeepPhase.label;
		}
		if (typeof upkeepPhase.icon === 'string') {
			upkeepDescriptor.icon = upkeepPhase.icon;
		}
		assignAssetDescriptor(descriptors, 'upkeep', upkeepDescriptor);
	}
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
