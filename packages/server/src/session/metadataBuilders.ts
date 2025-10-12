import {
	LAND_INFO,
	PASSIVE_INFO,
	PHASES,
	RESOURCES,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
} from '@kingdom-builder/contents';
import type {
	SerializedRegistry,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

interface NamedDefinition {
	name?: string | undefined;
	icon?: string | undefined;
	description?: string | undefined;
}

type PhaseStepList = NonNullable<SessionPhaseMetadata['steps']>;

export function buildRegistryDescriptorMap<Definition extends NamedDefinition>(
	registry: SerializedRegistry<Definition>,
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of Object.entries(registry)) {
		descriptors[id] = createDescriptor(
			definition.name,
			definition.icon,
			definition.description,
		);
	}
	return descriptors;
}

export function buildResourceMetadata(
	registry: SessionRegistriesPayload['resources'],
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, definition] of Object.entries(registry)) {
		const info = RESOURCES[key as keyof typeof RESOURCES];
		descriptors[key] = createDescriptor(
			definition.label ?? info?.label,
			definition.icon ?? info?.icon,
			definition.description ?? info?.description,
		);
	}
	return descriptors;
}

export function buildStatMetadata(): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(STATS)) {
		descriptors[key] = createDescriptor(
			info.label,
			info.icon,
			info.description,
		);
	}
	return descriptors;
}

export function buildPhaseMetadata(): Record<string, SessionPhaseMetadata> {
	const phases: Record<string, SessionPhaseMetadata> = {};
	for (const phase of PHASES) {
		const entry: SessionPhaseMetadata = {};
		if (phase.id !== undefined) {
			entry.id = phase.id;
		}
		if (phase.label !== undefined) {
			entry.label = phase.label;
		}
		if (phase.icon !== undefined) {
			entry.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			entry.action = phase.action;
		}
		if (phase.steps && phase.steps.length > 0) {
			entry.steps = phase.steps.map((step) => {
				const stepEntry: PhaseStepList[number] = { id: step.id };
				if (step.title !== undefined) {
					stepEntry.label = step.title;
				}
				if (step.icon !== undefined) {
					stepEntry.icon = step.icon;
				}
				if (step.triggers && step.triggers.length > 0) {
					stepEntry.triggers = [...step.triggers];
				}
				return stepEntry;
			});
		}
		if (phase.id !== undefined) {
			phases[phase.id] = entry;
		}
	}
	return phases;
}

export function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const triggers: Record<string, SessionTriggerMetadata> = {};
	for (const [key, info] of Object.entries(TRIGGER_INFO)) {
		triggers[key] = {
			label: info.past,
			icon: info.icon,
			future: info.future,
			past: info.past,
		};
	}
	return triggers;
}

export function buildAssetMetadata(): Record<
	string,
	SessionMetadataDescriptor
> {
	return {
		land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
		slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
		passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
	};
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
