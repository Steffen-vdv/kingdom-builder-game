import {
	BUILDINGS,
	DEVELOPMENTS,
	LAND_INFO,
	PASSIVE_INFO,
	PHASES,
	POPULATIONS,
	RESOURCES,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
} from '@kingdom-builder/contents';
import type { Registry } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionSnapshotMetadata,
	SessionSnapshotMetadataAssets,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

type DescriptorMap = Record<string, SessionMetadataDescriptor>;

type TriggerInfoEntry = {
	readonly icon?: string;
	readonly future?: string;
	readonly past?: string;
};

function readStringProperty(source: unknown, key: string): string | undefined {
	if (!source || typeof source !== 'object') {
		return undefined;
	}
	const record = source as Record<string, unknown>;
	const value = record[key];
	return typeof value === 'string' ? value : undefined;
}

function createDescriptor(
	label?: string,
	icon?: string,
	description?: string,
): SessionMetadataDescriptor {
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
}

function createDescriptorFromDefinition(
	definition: unknown,
	fallbackLabel: string,
): SessionMetadataDescriptor {
	const label =
		readStringProperty(definition, 'name') ??
		readStringProperty(definition, 'label') ??
		fallbackLabel;
	const icon = readStringProperty(definition, 'icon');
	const description = readStringProperty(definition, 'description');
	return createDescriptor(label, icon, description);
}

function createRegistryDescriptorMap<Definition>(
	registry: Registry<Definition>,
): DescriptorMap {
	const entries: DescriptorMap = {};
	for (const [id, definition] of registry.entries()) {
		entries[id] = createDescriptorFromDefinition(definition, id);
	}
	return entries;
}

function createResourceMetadata(): DescriptorMap {
	const entries: DescriptorMap = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		entries[key] = createDescriptor(
			info.label ?? key,
			info.icon,
			info.description,
		);
	}
	return entries;
}

function createStatMetadata(): DescriptorMap {
	const entries: DescriptorMap = {};
	for (const [key, info] of Object.entries(STATS)) {
		entries[key] = createDescriptor(
			info.label ?? key,
			info.icon,
			info.description,
		);
	}
	return entries;
}

function createPhaseMetadata(): Record<string, SessionPhaseMetadata> {
	const entries: Record<string, SessionPhaseMetadata> = {};
	for (const phase of PHASES) {
		const steps: SessionPhaseStepMetadata[] | undefined = phase.steps?.map(
			(step) => {
				const stepMetadata: SessionPhaseStepMetadata = { id: step.id };
				if (step.title !== undefined) {
					stepMetadata.label = step.title;
				}
				if (step.icon !== undefined) {
					stepMetadata.icon = step.icon;
				}
				if (step.triggers && step.triggers.length > 0) {
					stepMetadata.triggers = [...step.triggers];
				}
				return stepMetadata;
			},
		);
		const metadata: SessionPhaseMetadata = { id: phase.id };
		if (phase.label !== undefined) {
			metadata.label = phase.label;
		}
		if (phase.icon !== undefined) {
			metadata.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			metadata.action = phase.action;
		}
		if (steps && steps.length > 0) {
			metadata.steps = steps;
		}
		entries[phase.id] = metadata;
	}
	return entries;
}

function createTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const entries: Record<string, SessionTriggerMetadata> = {};
	const triggerInfo = TRIGGER_INFO as Record<string, TriggerInfoEntry>;
	for (const [id, info] of Object.entries(triggerInfo)) {
		const descriptor: SessionTriggerMetadata = {};
		if (info.past !== undefined) {
			descriptor.label = info.past;
			descriptor.past = info.past;
		}
		if (info.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info.future !== undefined) {
			descriptor.future = info.future;
		}
		entries[id] = descriptor;
	}
	return entries;
}

function createAssetMetadata(): SessionSnapshotMetadataAssets {
	return {
		land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
		slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
		passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
	};
}

export function createBaseSessionMetadata(): SessionSnapshotMetadata {
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources: createResourceMetadata(),
		populations: createRegistryDescriptorMap(POPULATIONS),
		buildings: createRegistryDescriptorMap(BUILDINGS),
		developments: createRegistryDescriptorMap(DEVELOPMENTS),
		stats: createStatMetadata(),
		phases: createPhaseMetadata(),
		triggers: createTriggerMetadata(),
		assets: createAssetMetadata(),
	};
	return structuredClone(metadata);
}
