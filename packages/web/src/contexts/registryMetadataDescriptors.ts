import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

export interface RegistryMetadataDescriptor {
	id: string;
	label: string;
	icon?: string;
	description?: string;
}

export type AssetMetadata = RegistryMetadataDescriptor;

export interface PhaseStepMetadata {
	id: string;
	label: string;
	icon?: string;
	triggers: ReadonlyArray<string>;
}

export interface PhaseMetadata {
	id: string;
	label: string;
	icon?: string;
	action: boolean;
	steps: ReadonlyArray<PhaseStepMetadata>;
	stepsById: Readonly<Record<string, PhaseStepMetadata>>;
}

export interface TriggerMetadata {
	id: string;
	label: string;
	icon?: string;
	future?: string;
	past?: string;
}

export interface MetadataLookup<TDescriptor extends { id: string }> {
	readonly record: Readonly<Record<string, TDescriptor>>;
	get(id: string): TDescriptor;
	values(): ReadonlyArray<TDescriptor>;
}

const freezeArray = <TValue>(values: Iterable<TValue>): ReadonlyArray<TValue> =>
	Object.freeze(Array.from(values));

const freezeRecord = <TValue>(record: Record<string, TValue>) =>
	Object.freeze({ ...record }) as Readonly<Record<string, TValue>>;

const formatLabel = (value: string): string => {
	const spaced = value.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

const createLookup = <TDescriptor extends { id: string }>(
	entries: Iterable<readonly [string, TDescriptor]>,
	fallback: (id: string) => TDescriptor,
): MetadataLookup<TDescriptor> => {
	const map = new Map<string, TDescriptor>(entries);
	const record = freezeRecord(Object.fromEntries(map.entries()));
	const values = freezeArray(map.values());
	const fallbackCache = new Map<string, TDescriptor>();
	const lookup: MetadataLookup<TDescriptor> = {
		record,
		get(id: string) {
			const known = map.get(id);
			if (known) {
				return known;
			}
			const cached = fallbackCache.get(id);
			if (cached) {
				return cached;
			}
			const descriptor = fallback(id);
			fallbackCache.set(id, descriptor);
			return descriptor;
		},
		values() {
			return values;
		},
	};
	const frozenLookup = Object.freeze(lookup);
	return frozenLookup;
};

interface RegistryDescriptorFallback {
	label?: string | undefined;
	icon?: string | undefined;
	description?: string | undefined;
}

const createRegistryDescriptor = (
	id: string,
	descriptor: SessionMetadataDescriptor | undefined,
	fallback: RegistryDescriptorFallback,
): RegistryMetadataDescriptor => {
	const label = descriptor?.label ?? fallback.label ?? formatLabel(id);
	const entry: RegistryMetadataDescriptor = { id, label };
	const icon = descriptor?.icon ?? fallback.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const description = descriptor?.description ?? fallback.description;
	if (description !== undefined) {
		entry.description = description;
	}
	return Object.freeze(entry);
};

const createPhaseStep = (step: SessionPhaseStepMetadata): PhaseStepMetadata => {
	const triggerSource: ReadonlyArray<string> = step.triggers ?? [];
	const triggers = Object.freeze([...triggerSource]);
	const entry: PhaseStepMetadata = {
		id: step.id,
		label: step.label ?? formatLabel(step.id),
		triggers,
	};
	if (step.icon !== undefined) {
		entry.icon = step.icon;
	}
	return Object.freeze(entry);
};

const createPhaseDescriptor = (
	id: string,
	phase: SessionPhaseMetadata | undefined,
): PhaseMetadata => {
	const steps = Array.isArray(phase?.steps)
		? phase.steps.map(createPhaseStep)
		: [];
	const stepsRecord = freezeRecord(
		Object.fromEntries(steps.map((step) => [step.id, step])),
	);
	const entry: PhaseMetadata = {
		id,
		label: phase?.label ?? formatLabel(id),
		action: phase?.action ?? false,
		steps: freezeArray(steps),
		stepsById: stepsRecord,
	};
	if (phase?.icon !== undefined) {
		entry.icon = phase.icon;
	}
	return Object.freeze(entry);
};

const createTriggerDescriptor = (
	id: string,
	trigger: SessionTriggerMetadata | undefined,
): TriggerMetadata => {
	const entry: TriggerMetadata = {
		id,
		label: trigger?.label ?? formatLabel(id),
	};
	if (trigger?.icon !== undefined) {
		entry.icon = trigger.icon;
	}
	if (trigger?.future !== undefined) {
		entry.future = trigger.future;
	}
	if (trigger?.past !== undefined) {
		entry.past = trigger.past;
	}
	return Object.freeze(entry);
};

const createDescriptorEntries = (
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
): Iterable<readonly [string, RegistryMetadataDescriptor]> => {
	if (!metadata) {
		return [];
	}
	return Object.entries(metadata).map(([id, descriptor]) => [
		id,
		createRegistryDescriptor(id, descriptor, {}),
	]);
};

const createDescriptorLookup = (
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createLookup(createDescriptorEntries(metadata), (id: string) =>
		createRegistryDescriptor(id, undefined, { label: formatLabel(id) }),
	);

export const buildResourceMetadata = (
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createDescriptorLookup(metadata);

export const buildRegistryMetadata = (
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createDescriptorLookup(metadata);

export const buildStatMetadata = (
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createDescriptorLookup(metadata);

export const buildPhaseMetadata = (
	metadata: Record<string, SessionPhaseMetadata> | undefined,
): MetadataLookup<PhaseMetadata> =>
	createLookup(
		metadata
			? Object.entries(metadata).map(([id, phase]) => [
					id,
					createPhaseDescriptor(id, phase),
				])
			: [],
		(id) => createPhaseDescriptor(id, undefined),
	);

export const buildTriggerMetadata = (
	metadata: Record<string, SessionTriggerMetadata> | undefined,
): MetadataLookup<TriggerMetadata> =>
	createLookup(
		metadata
			? Object.entries(metadata).map(([id, trigger]) => [
					id,
					createTriggerDescriptor(id, trigger),
				])
			: [],
		(id) => createTriggerDescriptor(id, undefined),
	);

export const DEFAULT_LAND_DESCRIPTOR: AssetMetadata = Object.freeze({
	id: 'land',
	label: 'Land',
	icon: '🗺️',
});

export const DEFAULT_SLOT_DESCRIPTOR: AssetMetadata = Object.freeze({
	id: 'slot',
	label: 'Development Slot',
	icon: '🧩',
});

export const DEFAULT_PASSIVE_DESCRIPTOR: AssetMetadata = Object.freeze({
	id: 'passive',
	label: 'Passive',
	icon: '♾️',
});

export const resolveAssetDescriptor = (
	id: string,
	descriptor: SessionMetadataDescriptor | undefined,
	fallback: AssetMetadata,
): AssetMetadata => {
	const entry: AssetMetadata = {
		id,
		label: descriptor?.label ?? fallback.label ?? formatLabel(id),
	};
	const icon = descriptor?.icon ?? fallback.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const description = descriptor?.description ?? fallback.description;
	if (description !== undefined) {
		entry.description = description;
	}
	return Object.freeze(entry);
};
