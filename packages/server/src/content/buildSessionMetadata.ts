import {
	RESOURCES,
	POPULATIONS,
	BUILDINGS,
	DEVELOPMENTS,
	STATS,
	PHASES,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	MODIFIER_INFO,
	OVERVIEW_CONTENT,
	type OverviewContentTemplate,
	type PhaseDef,
	type StepDef,
} from '@kingdom-builder/contents';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

type RegistryLike<DefinitionType> = {
	entries(): Array<[string, DefinitionType]>;
};

type DescriptorSource = {
	readonly label?: string;
	readonly name?: string;
	readonly icon?: string;
	readonly description?: string;
};

type ExtendedSessionSnapshotMetadata = SessionSnapshotMetadata & {
	modifiers?: Readonly<Record<string, SessionMetadataDescriptor>>;
	readonly overview?: OverviewContentTemplate;
};

type PhaseStepMetadataEntry = NonNullable<
	SessionPhaseMetadata['steps']
>[number];

const EMPTY_EVALUATION_MODIFIERS: SessionSnapshotMetadata['passiveEvaluationModifiers'] =
	Object.freeze({});

function entriesOf<RecordType extends Record<string, unknown>>(
	record: RecordType,
): ReadonlyArray<[keyof RecordType & string, RecordType[keyof RecordType]]> {
	return Object.entries(record) as ReadonlyArray<
		[keyof RecordType & string, RecordType[keyof RecordType]]
	>;
}

function toDescriptor(
	source: DescriptorSource | undefined,
	fallbackLabel?: string,
): SessionMetadataDescriptor | undefined {
	if (!source) {
		return undefined;
	}
	const label = source.label ?? source.name ?? fallbackLabel;
	const icon = source.icon;
	const description = source.description;
	if (label === undefined && icon === undefined && description === undefined) {
		return undefined;
	}
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
	return Object.freeze(descriptor);
}

function buildDescriptorRecord<DefinitionType extends DescriptorSource>(
	source: RegistryLike<DefinitionType>,
): Readonly<Record<string, SessionMetadataDescriptor>> {
	const entries: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of source.entries()) {
		const descriptor = toDescriptor(definition, id);
		if (descriptor) {
			entries[id] = descriptor;
		}
	}
	return Object.freeze(entries);
}

function buildResourceDescriptorRecord(): Readonly<
	Record<string, SessionMetadataDescriptor>
> {
	const entries: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of entriesOf(RESOURCES)) {
		const descriptor = toDescriptor(info, key);
		if (descriptor) {
			entries[key] = descriptor;
		}
	}
	return Object.freeze(entries);
}

function buildStatDescriptorRecord(): Readonly<
	Record<string, SessionMetadataDescriptor>
> {
	const entries: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of entriesOf(STATS)) {
		const descriptor = toDescriptor(info, key);
		if (descriptor) {
			entries[key] = descriptor;
		}
	}
	return Object.freeze(entries);
}

function buildPhaseStep(step: StepDef): PhaseStepMetadataEntry {
	const entry: PhaseStepMetadataEntry = {
		id: step.id,
	};
	const label = step.title;
	if (label !== undefined) {
		entry.label = label;
	}
	if (step.icon !== undefined) {
		entry.icon = step.icon;
	}
	if (Array.isArray(step.triggers) && step.triggers.length > 0) {
		const triggers = [...step.triggers];
		Object.freeze(triggers);
		entry.triggers = triggers;
	}
	return Object.freeze(entry);
}

function buildPhaseMetadata(): Readonly<Record<string, SessionPhaseMetadata>> {
	const entries: Record<string, SessionPhaseMetadata> = {};
	for (const phase of PHASES as ReadonlyArray<PhaseDef>) {
		const phaseEntry: SessionPhaseMetadata = {
			id: phase.id,
		};
		if (phase.label !== undefined) {
			phaseEntry.label = phase.label;
		}
		if (phase.icon !== undefined) {
			phaseEntry.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			phaseEntry.action = phase.action;
		}
		if (Array.isArray(phase.steps) && phase.steps.length > 0) {
			const steps = phase.steps.map((step) => buildPhaseStep(step));
			Object.freeze(steps);
			phaseEntry.steps = steps;
		}
		entries[phase.id] = Object.freeze(phaseEntry);
	}
	return Object.freeze(entries);
}

function buildTriggerMetadata(): Readonly<
	Record<string, SessionTriggerMetadata>
> {
	const entries: Record<string, SessionTriggerMetadata> = {};
	for (const [id, info] of entriesOf(TRIGGER_INFO)) {
		const entry: SessionTriggerMetadata = {};
		if (info.icon !== undefined) {
			entry.icon = info.icon;
		}
		if (info.future !== undefined) {
			entry.future = info.future;
		}
		if (info.past !== undefined) {
			entry.past = info.past;
		}
		if (info.past !== undefined) {
			entry.label = info.past;
		}
		entries[id] = Object.freeze(entry);
	}
	return Object.freeze(entries);
}

function buildAssetMetadata(): Readonly<
	Record<string, SessionMetadataDescriptor>
> {
	const entries: Record<string, SessionMetadataDescriptor> = {};
	const land = toDescriptor(LAND_INFO, 'land');
	if (land) {
		entries.land = land;
	}
	const slot = toDescriptor(SLOT_INFO, 'slot');
	if (slot) {
		entries.slot = slot;
	}
	const passive = toDescriptor(PASSIVE_INFO, 'passive');
	if (passive) {
		entries.passive = passive;
	}
	return Object.freeze(entries);
}

function buildModifierMetadata(): Readonly<
	Record<string, SessionMetadataDescriptor>
> {
	const entries: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of entriesOf(MODIFIER_INFO)) {
		const descriptor = toDescriptor(info, key);
		if (descriptor) {
			entries[key] = descriptor;
		}
	}
	return Object.freeze(entries);
}

function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as unknown as T;
	}
	if (value !== null && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	return value;
}

function buildOverviewContent(): OverviewContentTemplate {
	const clone = structuredClone(OVERVIEW_CONTENT);
	return deepFreeze(clone);
}

export function buildSessionMetadata(): SessionSnapshotMetadata {
	const populations = buildDescriptorRecord(
		POPULATIONS as RegistryLike<DescriptorSource>,
	);
	const buildings = buildDescriptorRecord(
		BUILDINGS as RegistryLike<DescriptorSource>,
	);
	const developments = buildDescriptorRecord(
		DEVELOPMENTS as RegistryLike<DescriptorSource>,
	);
	const assets = buildAssetMetadata();
	const modifiers = buildModifierMetadata();
	const metadata: ExtendedSessionSnapshotMetadata = {
		passiveEvaluationModifiers: EMPTY_EVALUATION_MODIFIERS,
		resources: buildResourceDescriptorRecord(),
		populations,
		buildings,
		developments,
		stats: buildStatDescriptorRecord(),
		phases: buildPhaseMetadata(),
		triggers: buildTriggerMetadata(),
		assets,
		modifiers,
		overview: buildOverviewContent(),
	};
	return Object.freeze(metadata);
}
