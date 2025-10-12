import type {
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionTriggerMetadata,
	SessionEffectLogMap,
	SessionPassiveEvaluationModifierMap,
	SerializedRegistry,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '@kingdom-builder/contents';

export interface MetadataSources {
	resources: Record<string, DescriptorSource>;
	stats: Record<string, DescriptorSource>;
	triggers: Record<string, TriggerSource>;
	land: DescriptorSource;
	slot: DescriptorSource;
	passive: DescriptorSource;
}

type DescriptorSource = {
	label?: string | undefined;
	icon?: string | undefined;
	description?: string | undefined;
};

type TriggerSource = DescriptorSource & {
	future?: string | undefined;
	past?: string | undefined;
};

export function createSessionBaseMetadata(
	registries: SessionRegistriesPayload,
	phases: PhaseDef[],
	sources: MetadataSources,
): SessionSnapshotMetadata {
	return freezeObject({
		passiveEvaluationModifiers: freezePassiveEvaluationModifiers({}),
		resources: createResourceMetadata(sources.resources),
		populations: createRegistryDescriptorMap(registries.populations),
		buildings: createRegistryDescriptorMap(registries.buildings),
		developments: createRegistryDescriptorMap(registries.developments),
		stats: createStatMetadata(sources.stats),
		phases: createPhaseMetadata(phases),
		triggers: createTriggerMetadata(sources.triggers),
		assets: createAssetMetadata(sources),
	});
}

export function mergeSessionMetadata(
	baseMetadata: SessionSnapshotMetadata,
	metadata: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	const passiveEvaluationModifiers = freezePassiveEvaluationModifiers(
		structuredClone(metadata.passiveEvaluationModifiers),
	);
	const composed: SessionSnapshotMetadata = {
		...baseMetadata,
		passiveEvaluationModifiers,
	};
	if (metadata.effectLogs) {
		composed.effectLogs = freezeEffectLogs(
			structuredClone(metadata.effectLogs),
		);
	} else if ('effectLogs' in composed) {
		delete composed.effectLogs;
	}
	if (metadata.resources) {
		composed.resources = freezeDescriptorRecord(
			structuredClone(metadata.resources),
		);
	}
	if (metadata.populations) {
		composed.populations = freezeDescriptorRecord(
			structuredClone(metadata.populations),
		);
	}
	if (metadata.buildings) {
		composed.buildings = freezeDescriptorRecord(
			structuredClone(metadata.buildings),
		);
	}
	if (metadata.developments) {
		composed.developments = freezeDescriptorRecord(
			structuredClone(metadata.developments),
		);
	}
	if (metadata.stats) {
		composed.stats = freezeDescriptorRecord(structuredClone(metadata.stats));
	}
	if (metadata.phases) {
		composed.phases = freezePhaseRecord(structuredClone(metadata.phases));
	}
	if (metadata.triggers) {
		composed.triggers = freezeTriggerRecord(structuredClone(metadata.triggers));
	}
	if (metadata.assets) {
		composed.assets = freezeDescriptorRecord(structuredClone(metadata.assets));
	}
	return freezeObject(composed);
}

function createDescriptor(
	label?: string,
	icon?: string,
	description?: string,
): SessionMetadataDescriptor {
	const descriptor: SessionMetadataDescriptor = {};
	if (label !== undefined) {
		descriptor.label = structuredClone(label);
	}
	if (icon !== undefined) {
		descriptor.icon = structuredClone(icon);
	}
	if (description !== undefined) {
		descriptor.description = structuredClone(description);
	}
	return freezeObject(descriptor);
}

function createRegistryDescriptorMap(
	registry: SerializedRegistry<Record<string, unknown>>,
): Record<string, SessionMetadataDescriptor> {
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of Object.entries(registry)) {
		const source = definition as Partial<{
			name: string;
			icon: string;
			description: string;
		}>;
		record[id] = createDescriptor(
			source?.name,
			source?.icon,
			source?.description,
		);
	}
	return freezeDescriptorRecord(record);
}

function createResourceMetadata(
	resources: MetadataSources['resources'],
): Record<string, SessionMetadataDescriptor> {
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(resources)) {
		record[key] = createDescriptor(info.label, info.icon, info.description);
	}
	return freezeDescriptorRecord(record);
}

function createStatMetadata(
	stats: MetadataSources['stats'],
): Record<string, SessionMetadataDescriptor> {
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(stats)) {
		record[key] = createDescriptor(info.label, info.icon, info.description);
	}
	return freezeDescriptorRecord(record);
}

function createPhaseMetadata(
	phases: PhaseDef[],
): Record<string, SessionPhaseMetadata> {
	const record: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		const phaseMetadata: SessionPhaseMetadata = {
			id: structuredClone(phase.id),
		};
		if (phase.label !== undefined) {
			phaseMetadata.label = structuredClone(phase.label);
		}
		if (phase.icon !== undefined) {
			phaseMetadata.icon = structuredClone(phase.icon);
		}
		if (phase.action !== undefined) {
			phaseMetadata.action = phase.action;
		}
		if (phase.steps && phase.steps.length > 0) {
			phaseMetadata.steps = phase.steps.map((step) => {
				const stepMetadata: SessionPhaseStepMetadata = {
					id: structuredClone(step.id),
				};
				if (step.title !== undefined) {
					stepMetadata.label = structuredClone(step.title);
				}
				if (step.icon !== undefined) {
					stepMetadata.icon = structuredClone(step.icon);
				}
				if (step.triggers && step.triggers.length > 0) {
					stepMetadata.triggers = structuredClone(step.triggers);
				}
				return stepMetadata;
			});
		}
		record[phase.id] = phaseMetadata;
	}
	return freezePhaseRecord(record);
}

function createTriggerMetadata(
	triggers: MetadataSources['triggers'],
): Record<string, SessionTriggerMetadata> {
	const record: Record<string, SessionTriggerMetadata> = {};
	for (const [key, info] of Object.entries(triggers)) {
		const trigger: SessionTriggerMetadata = {};
		if (info.past !== undefined) {
			trigger.label = structuredClone(info.past);
			trigger.past = structuredClone(info.past);
		}
		if (info.icon !== undefined) {
			trigger.icon = structuredClone(info.icon);
		}
		if (info.future !== undefined) {
			trigger.future = structuredClone(info.future);
		}
		record[key] = trigger;
	}
	return freezeTriggerRecord(record);
}

function createAssetMetadata(
	sources: MetadataSources,
): Record<string, SessionMetadataDescriptor> {
	return freezeDescriptorRecord({
		land: createDescriptor(sources.land.label, sources.land.icon),
		slot: createDescriptor(sources.slot.label, sources.slot.icon),
		passive: createDescriptor(sources.passive.label, sources.passive.icon),
	});
}

function freezeDescriptorRecord(
	record: Record<string, SessionMetadataDescriptor>,
): Record<string, SessionMetadataDescriptor> {
	const result: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, descriptor] of Object.entries(record)) {
		result[key] = freezeObject({ ...descriptor });
	}
	return freezeObject(result);
}

function freezePhaseRecord(
	record: Record<string, SessionPhaseMetadata>,
): Record<string, SessionPhaseMetadata> {
	const result: Record<string, SessionPhaseMetadata> = {};
	for (const [key, metadata] of Object.entries(record)) {
		const cloned: SessionPhaseMetadata = { ...metadata };
		if (metadata.steps && metadata.steps.length > 0) {
			const steps = metadata.steps.map((step) => {
				const clonedStep: SessionPhaseStepMetadata = { ...step };
				if (step.triggers) {
					clonedStep.triggers = freezeArray([...(step.triggers ?? [])]);
				}
				return freezeObject(clonedStep);
			});
			cloned.steps = freezeArray(steps);
		}
		result[key] = freezeObject(cloned);
	}
	return freezeObject(result);
}

function freezeTriggerRecord(
	record: Record<string, SessionTriggerMetadata>,
): Record<string, SessionTriggerMetadata> {
	const result: Record<string, SessionTriggerMetadata> = {};
	for (const [key, metadata] of Object.entries(record)) {
		result[key] = freezeObject({ ...metadata });
	}
	return freezeObject(result);
}

function freezePassiveEvaluationModifiers(
	modifiers: SessionPassiveEvaluationModifierMap,
): SessionPassiveEvaluationModifierMap {
	const result: Record<string, string[]> = {};
	for (const [key, values] of Object.entries(modifiers)) {
		result[key] = freezeArray([...(values ?? [])]);
	}
	return freezeObject(result) as SessionPassiveEvaluationModifierMap;
}

function freezeEffectLogs(
	effectLogs: SessionEffectLogMap,
): SessionEffectLogMap {
	const result: Record<string, unknown[]> = {};
	for (const [key, entries] of Object.entries(effectLogs)) {
		result[key] = freezeArray([...(entries ?? [])]);
	}
	return freezeObject(result) as SessionEffectLogMap;
}

function freezeArray<Value>(values: Value[]): Value[] {
	return freezeObject(values);
}

function freezeObject<T extends object>(value: T): T {
	return Object.freeze(value) as T;
}
