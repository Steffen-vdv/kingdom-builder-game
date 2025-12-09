import {
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	POPULATION_INFO,
	SLOT_INFO,
	TRIGGER_META,
	UPKEEP_INFO,
	TRANSFER_INFO,
	PHASES,
} from '@kingdom-builder/contents';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PhaseConfig,
	Registry,
	SerializedRegistry,
	SessionMetadataDescriptor,
	SessionMetadataSnapshot,
	SessionPhaseMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol';

type SessionMetadataDescriptorMap = Record<string, SessionMetadataDescriptor>;
type SessionPhaseStep = NonNullable<SessionPhaseMetadata['steps']>[number];

export type SessionStaticMetadataPayload = SessionMetadataSnapshot;

/**
 * Minimal resource definition shape required for metadata extraction.
 * This allows raw content definitions to be used without computed fields.
 */
export interface ResourceMetadataSource {
	label?: string;
	icon?: string;
	description?: string | null;
	displayAsPercent?: boolean;
}

export interface BuildSessionMetadataOptions {
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	resources: SerializedRegistry<ResourceMetadataSource>;
	phases: ReadonlyArray<PhaseConfig>;
}

export function buildSessionMetadata(
	options: BuildSessionMetadataOptions,
): SessionStaticMetadataPayload {
	const metadata: SessionStaticMetadataPayload = {};
	// Resources now include what was previously stats and populations
	const resourceMetadata = buildResourceMetadata(options.resources);
	if (hasEntries(resourceMetadata)) {
		metadata.resources = resourceMetadata;
	}
	const buildingMetadata = buildRegistryMetadata(options.buildings);
	if (hasEntries(buildingMetadata)) {
		metadata.buildings = buildingMetadata;
	}
	const developmentMetadata = buildRegistryMetadata(options.developments);
	if (hasEntries(developmentMetadata)) {
		metadata.developments = developmentMetadata;
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
	resources: SerializedRegistry<ResourceMetadataSource>,
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
		if (definition.displayAsPercent) {
			descriptor.displayAsPercent = definition.displayAsPercent;
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

// Build a map from stepId to phase info for step trigger resolution
function buildStepToPhaseMap(): Map<string, { icon: string; label: string }> {
	const map = new Map<string, { icon: string; label: string }>();
	for (const phase of PHASES) {
		for (const step of phase.steps ?? []) {
			map.set(step.id, {
				icon: phase.icon ?? '',
				label: phase.label ?? phase.id,
			});
		}
	}
	return map;
}

function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const descriptors: Record<string, SessionTriggerMetadata> = {};
	const stepToPhase = buildStepToPhaseMap();

	for (const [triggerId, meta] of Object.entries(TRIGGER_META)) {
		const descriptor: SessionTriggerMetadata = { label: meta.label };

		if (meta.type === 'step') {
			// Step trigger: derive icon and text from phase
			const phaseInfo = stepToPhase.get(meta.stepId);
			if (phaseInfo) {
				descriptor.icon = phaseInfo.icon;
				descriptor.future = `On your ${phaseInfo.icon} ${phaseInfo.label} Phase`;
				descriptor.past = `${phaseInfo.label} Phase`;
			}
		} else {
			// Event trigger: use provided icon and text
			descriptor.icon = meta.icon;
			descriptor.future = meta.text;
			descriptor.past = meta.label;
		}

		descriptors[triggerId] = descriptor;
	}

	return descriptors;
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
