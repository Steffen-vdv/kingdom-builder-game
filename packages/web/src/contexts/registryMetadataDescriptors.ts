import type {
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	Registry,
} from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadataDescriptor,
	SessionPhaseStepMetadataDescriptor,
	SessionResourceDefinition,
	SessionTriggerMetadataDescriptor,
} from '@kingdom-builder/protocol/session';

type NamedDefinition = {
	readonly name: string;
	readonly icon?: string;
	readonly description?: string;
};

type MetadataSource = SessionMetadataDescriptor | undefined;

const formatFallbackLabel = (value: string): string => {
	const spaced = value.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

const freezeRecord = <TValue>(
	record: Record<string, TValue>,
): Readonly<Record<string, TValue>> => Object.freeze({ ...record });

const freezeArray = <TValue>(values: TValue[]): ReadonlyArray<TValue> =>
	Object.freeze([...values]);

const freezeTriggers = (triggers: string[] | undefined) => {
	if (!triggers || triggers.length === 0) {
		return Object.freeze<string[]>([]);
	}
	return freezeArray(triggers);
};

type MutableRegistryDescriptor = {
	id: string;
	label: string;
	icon?: string;
	description?: string;
};

const resolveRegistryDescriptor = (
	id: string,
	descriptor: MetadataSource,
	fallbackLabel?: string,
	fallbackIcon?: string,
	fallbackDescription?: string,
): MutableRegistryDescriptor => {
	const label = descriptor?.label ?? fallbackLabel ?? formatFallbackLabel(id);
	const icon = descriptor?.icon ?? fallbackIcon;
	const description = descriptor?.description ?? fallbackDescription;
	const resolved: MutableRegistryDescriptor = { id, label };
	if (icon !== undefined) {
		resolved.icon = icon;
	}
	if (description !== undefined) {
		resolved.description = description;
	}
	return resolved;
};

export interface RegistryMetadataDescriptor {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
}

export interface PhaseStepMetadata {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly triggers: ReadonlyArray<string>;
}

export interface PhaseMetadata extends RegistryMetadataDescriptor {
	readonly action: boolean;
	readonly steps: ReadonlyArray<PhaseStepMetadata>;
	readonly stepsById: Readonly<Record<string, PhaseStepMetadata>>;
}

export interface TriggerMetadata extends RegistryMetadataDescriptor {
	readonly future: string;
	readonly past: string;
}

export interface AssetMetadata extends RegistryMetadataDescriptor {}

export interface MetadataLookup<TDescriptor extends { id: string }> {
	readonly record: Readonly<Record<string, TDescriptor>>;
	get(id: string): TDescriptor;
	values(): ReadonlyArray<TDescriptor>;
}

const createMetadataLookup = <TDescriptor extends { id: string }>(
	record: Record<string, TDescriptor>,
	fallback: (id: string) => TDescriptor,
): MetadataLookup<TDescriptor> => {
	const frozenRecord = freezeRecord(record);
	const list = freezeArray(Object.values(frozenRecord));
	const get = (id: string): TDescriptor => {
		const descriptor = frozenRecord[id];
		if (descriptor !== undefined) {
			return descriptor;
		}
		return fallback(id);
	};
	return Object.freeze({
		record: frozenRecord,
		get,
		values: () => list,
	});
};

const mergeRegistryDescriptors = <TDefinition extends NamedDefinition>(
	registry: Registry<TDefinition>,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
) => {
	const entries: Record<string, RegistryMetadataDescriptor> = {};
	const map = new Map<string, TDefinition>(registry.entries());
	const ids = new Set<string>([
		...map.keys(),
		...(descriptors ? Object.keys(descriptors) : []),
	]);
	for (const id of ids) {
		const definition = map.get(id);
		const descriptor = descriptors?.[id];
		const resolved = resolveRegistryDescriptor(
			id,
			descriptor,
			definition?.name,
			definition?.icon,
			definition?.description,
		);
		entries[id] = Object.freeze(resolved);
	}
	return entries;
};

const mergeResourceDescriptors = (
	resources: Record<string, SessionResourceDefinition>,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
) => {
	const entries: Record<string, RegistryMetadataDescriptor> = {};
	const ids = new Set<string>([
		...Object.keys(resources),
		...(descriptors ? Object.keys(descriptors) : []),
	]);
	for (const id of ids) {
		const definition = resources[id];
		const descriptor = descriptors?.[id];
		const resolved = resolveRegistryDescriptor(
			id,
			descriptor,
			definition?.label ?? definition?.key,
			definition?.icon,
			definition?.description,
		);
		entries[id] = Object.freeze(resolved);
	}
	return entries;
};

const mergeStatDescriptors = (
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
) => {
	const entries: Record<string, RegistryMetadataDescriptor> = {};
	if (descriptors) {
		for (const [id, descriptor] of Object.entries(descriptors)) {
			entries[id] = Object.freeze(resolveRegistryDescriptor(id, descriptor));
		}
	}
	return entries;
};

const createPhaseStep = (
	step: SessionPhaseStepMetadataDescriptor,
): PhaseStepMetadata => {
	const resolved = resolveRegistryDescriptor(step.id, step);
	return Object.freeze({
		...resolved,
		triggers: freezeTriggers(step.triggers),
	});
};

const createPhaseDescriptor = (
	id: string,
	descriptor: SessionPhaseMetadataDescriptor | undefined,
): PhaseMetadata => {
	const resolved = resolveRegistryDescriptor(id, descriptor);
	const steps = descriptor?.steps ?? [];
	const mapped = freezeArray(steps.map(createPhaseStep));
	const stepsById = freezeRecord(
		Object.fromEntries(mapped.map((step) => [step.id, step])),
	);
	return Object.freeze({
		...resolved,
		action: descriptor?.action ?? false,
		steps: mapped,
		stepsById,
	});
};

const createTriggerDescriptor = (
	id: string,
	descriptor: SessionTriggerMetadataDescriptor | undefined,
): TriggerMetadata => {
	const resolved = resolveRegistryDescriptor(id, descriptor);
	const fallback = resolved.label;
	return Object.freeze({
		...resolved,
		future: descriptor?.future ?? fallback,
		past: descriptor?.past ?? fallback,
	});
};

const createFallbackRegistryDescriptor = (
	id: string,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
) => Object.freeze(resolveRegistryDescriptor(id, descriptors?.[id]));

const createFallbackPhaseDescriptor = (
	id: string,
	descriptors: Record<string, SessionPhaseMetadataDescriptor> | undefined,
) => createPhaseDescriptor(id, descriptors?.[id]);

const createFallbackTriggerDescriptor = (
	id: string,
	descriptors: Record<string, SessionTriggerMetadataDescriptor> | undefined,
) => createTriggerDescriptor(id, descriptors?.[id]);

export const buildResourceMetadata = (
	resources: Record<string, SessionResourceDefinition>,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createMetadataLookup(mergeResourceDescriptors(resources, descriptors), (id) =>
		createFallbackRegistryDescriptor(id, descriptors),
	);

export const buildRegistryMetadata = (
	registry: Registry<BuildingConfig | DevelopmentConfig | PopulationConfig>,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createMetadataLookup(
		mergeRegistryDescriptors(
			registry as Registry<NamedDefinition>,
			descriptors,
		),
		(id) => createFallbackRegistryDescriptor(id, descriptors),
	);

export const buildStatMetadata = (
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createMetadataLookup(mergeStatDescriptors(descriptors), (id) =>
		createFallbackRegistryDescriptor(id, descriptors),
	);

export const buildPhaseMetadata = (
	descriptors: Record<string, SessionPhaseMetadataDescriptor> | undefined,
): MetadataLookup<PhaseMetadata> =>
	createMetadataLookup(
		Object.fromEntries(
			Object.entries(descriptors ?? {}).map(([id, descriptor]) => [
				id,
				createPhaseDescriptor(id, descriptor),
			]),
		),
		(id) => createFallbackPhaseDescriptor(id, descriptors),
	);

export const buildTriggerMetadata = (
	descriptors: Record<string, SessionTriggerMetadataDescriptor> | undefined,
): MetadataLookup<TriggerMetadata> =>
	createMetadataLookup(
		Object.fromEntries(
			Object.entries(descriptors ?? {}).map(([id, descriptor]) => [
				id,
				createTriggerDescriptor(id, descriptor),
			]),
		),
		(id) => createFallbackTriggerDescriptor(id, descriptors),
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
	defaultDescriptor: AssetMetadata,
): AssetMetadata => {
	const resolved = resolveRegistryDescriptor(
		id,
		descriptor,
		defaultDescriptor.label,
		defaultDescriptor.icon,
		defaultDescriptor.description,
	);
	return Object.freeze(resolved);
};
