import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

type PhaseStepList = NonNullable<SessionPhaseMetadata['steps']>;

type PhaseStepEntry = PhaseStepList[number];

export function mergeDescriptorRecords(
	base: Record<string, SessionMetadataDescriptor>,
	existing?: Record<string, SessionMetadataDescriptor>,
): Record<string, SessionMetadataDescriptor> {
	if (!existing) {
		return structuredClone(base);
	}
	const result: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, descriptor] of Object.entries(existing)) {
		result[key] = structuredClone(descriptor);
	}
	for (const [key, descriptor] of Object.entries(base)) {
		const target = result[key];
		if (target) {
			if (target.label === undefined && descriptor.label !== undefined) {
				target.label = descriptor.label;
			}
			if (target.icon === undefined && descriptor.icon !== undefined) {
				target.icon = descriptor.icon;
			}
			if (
				target.description === undefined &&
				descriptor.description !== undefined
			) {
				target.description = descriptor.description;
			}
			continue;
		}
		result[key] = structuredClone(descriptor);
	}
	return result;
}

export function mergePhaseMetadataRecords(
	base: Record<string, SessionPhaseMetadata>,
	existing?: Record<string, SessionPhaseMetadata>,
): Record<string, SessionPhaseMetadata> {
	if (!existing) {
		return structuredClone(base);
	}
	const result: Record<string, SessionPhaseMetadata> = {};
	for (const [key, metadata] of Object.entries(existing)) {
		result[key] = structuredClone(metadata);
	}
	for (const [key, metadata] of Object.entries(base)) {
		const target = result[key];
		if (target) {
			mergePhaseMetadataEntry(target, metadata);
			continue;
		}
		result[key] = structuredClone(metadata);
	}
	return result;
}

function mergePhaseMetadataEntry(
	target: SessionPhaseMetadata,
	source: SessionPhaseMetadata,
): void {
	if (target.id === undefined && source.id !== undefined) {
		target.id = source.id;
	}
	if (target.label === undefined && source.label !== undefined) {
		target.label = source.label;
	}
	if (target.icon === undefined && source.icon !== undefined) {
		target.icon = source.icon;
	}
	if (target.action === undefined && source.action !== undefined) {
		target.action = source.action;
	}
	if (!target.steps || target.steps.length === 0) {
		if (source.steps && source.steps.length > 0) {
			target.steps = source.steps.map((step) => structuredClone(step));
		}
		return;
	}
	if (!source.steps || source.steps.length === 0) {
		return;
	}
	mergeStepMetadata(target.steps, source.steps);
}

function mergeStepMetadata(
	targetSteps: PhaseStepList,
	sourceSteps: PhaseStepList,
): void {
	const index = new Map<string, PhaseStepEntry>();
	for (const step of targetSteps) {
		index.set(step.id, step);
	}
	for (const source of sourceSteps) {
		const target = index.get(source.id);
		if (target) {
			if (target.label === undefined && source.label !== undefined) {
				target.label = source.label;
			}
			if (target.icon === undefined && source.icon !== undefined) {
				target.icon = source.icon;
			}
			if (
				(!target.triggers || target.triggers.length === 0) &&
				source.triggers &&
				source.triggers.length > 0
			) {
				target.triggers = [...source.triggers];
			}
			continue;
		}
		targetSteps.push(structuredClone(source));
	}
}

export function mergeTriggerMetadataRecords(
	base: Record<string, SessionTriggerMetadata>,
	existing?: Record<string, SessionTriggerMetadata>,
): Record<string, SessionTriggerMetadata> {
	if (!existing) {
		return structuredClone(base);
	}
	const result: Record<string, SessionTriggerMetadata> = {};
	for (const [key, metadata] of Object.entries(existing)) {
		result[key] = structuredClone(metadata);
	}
	for (const [key, metadata] of Object.entries(base)) {
		const target = result[key];
		if (target) {
			if (target.label === undefined && metadata.label !== undefined) {
				target.label = metadata.label;
			}
			if (target.icon === undefined && metadata.icon !== undefined) {
				target.icon = metadata.icon;
			}
			if (target.future === undefined && metadata.future !== undefined) {
				target.future = metadata.future;
			}
			if (target.past === undefined && metadata.past !== undefined) {
				target.past = metadata.past;
			}
			continue;
		}
		result[key] = structuredClone(metadata);
	}
	return result;
}
