import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionResourceDefinition,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

export interface RegistryMetadataDescriptor {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
}

export interface MetadataLookup<TDescriptor extends { id: string }> {
	readonly record: Readonly<Record<string, TDescriptor>>;
	values(): ReadonlyArray<TDescriptor>;
	get(id: string): TDescriptor;
}

interface DefinitionRegistry<TConfig> {
	keys(): string[];
	has(id: string): boolean;
	get(id: string): TConfig;
}

export interface AssetMetadata extends RegistryMetadataDescriptor {}

export interface PhaseStepMetadata extends RegistryMetadataDescriptor {
	readonly triggers: ReadonlyArray<string>;
}

export interface PhaseMetadata extends RegistryMetadataDescriptor {
	readonly action: boolean;
	readonly steps: ReadonlyArray<PhaseStepMetadata>;
	readonly stepsById: Readonly<Record<string, PhaseStepMetadata>>;
}

export interface TriggerMetadata extends RegistryMetadataDescriptor {
	readonly future?: string;
	readonly past?: string;
}

const freezeRecord = <TValue>(
	record: Record<string, TValue>,
): Readonly<Record<string, TValue>> => Object.freeze({ ...record });

const freezeArray = <TValue>(values: TValue[]): ReadonlyArray<TValue> =>
	Object.freeze(values.slice());

const formatFallbackLabel = (id: string): string => {
	const spaced = id.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return id;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

const toFrozenDescriptor = (
	id: string,
	label: string | undefined,
	icon: string | undefined,
	description: string | undefined,
): RegistryMetadataDescriptor =>
	Object.freeze({
		id,
		label: label ?? formatFallbackLabel(id),
		...(icon !== undefined ? { icon } : {}),
		...(description !== undefined ? { description } : {}),
	});

const mergeDescriptor = (
	id: string,
	source: SessionMetadataDescriptor | undefined,
	fallbackLabel?: string,
	fallbackIcon?: string,
	fallbackDescription?: string,
): RegistryMetadataDescriptor => {
	const label = source?.label ?? fallbackLabel;
	const icon = source?.icon ?? fallbackIcon;
	const description = source?.description ?? fallbackDescription;
	return toFrozenDescriptor(id, label, icon, description);
};

const createLookup = <TDescriptor extends { id: string }>(
	record: Record<string, TDescriptor>,
	createFallback: (id: string) => TDescriptor,
): MetadataLookup<TDescriptor> => {
	const frozenRecord = freezeRecord(record);
	const values = freezeArray(Object.values(frozenRecord));
	const cache = new Map<string, TDescriptor>();
	return Object.freeze({
		record: frozenRecord,
		values: () => values,
		get: (id: string): TDescriptor => {
			const known = frozenRecord[id];
			if (known) {
				return known;
			}
			const cached = cache.get(id);
			if (cached) {
				return cached;
			}
			const created = createFallback(id);
			cache.set(id, created);
			return created;
		},
	});
};

const collectRegistryDescriptors = <
	TConfig extends { name: string; icon?: string | undefined },
>(
	registry: DefinitionRegistry<TConfig>,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): Record<string, RegistryMetadataDescriptor> => {
	const record: Record<string, RegistryMetadataDescriptor> = {};
	for (const id of registry.keys()) {
		const definition = registry.has(id) ? registry.get(id) : undefined;
		record[id] = mergeDescriptor(
			id,
			descriptors?.[id],
			definition?.name,
			definition?.icon,
		);
	}
	if (descriptors) {
		for (const [id, descriptor] of Object.entries(descriptors)) {
			if (!record[id]) {
				record[id] = mergeDescriptor(id, descriptor);
			}
		}
	}
	return record;
};

const createResourceDescriptor = (
	id: string,
	definition: SessionResourceDefinition | undefined,
	descriptor: SessionMetadataDescriptor | undefined,
): RegistryMetadataDescriptor =>
	mergeDescriptor(
		id,
		descriptor,
		definition?.label,
		definition?.icon,
		definition?.description,
	);

export const buildResourceMetadata = (
	resources: Record<string, SessionResourceDefinition>,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> => {
	const record: Record<string, RegistryMetadataDescriptor> = {};
	for (const [id, definition] of Object.entries(resources)) {
		record[id] = createResourceDescriptor(id, definition, descriptors?.[id]);
	}
	if (descriptors) {
		for (const [id, descriptor] of Object.entries(descriptors)) {
			if (!record[id]) {
				record[id] = createResourceDescriptor(id, undefined, descriptor);
			}
		}
	}
	return createLookup(record, (id) =>
		createResourceDescriptor(id, undefined, descriptors?.[id]),
	);
};

export const buildRegistryMetadata = <
	TConfig extends { name: string; icon?: string | undefined },
>(
	registry: DefinitionRegistry<TConfig>,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createLookup(collectRegistryDescriptors(registry, descriptors), (id) =>
		mergeDescriptor(id, descriptors?.[id]),
	);

const buildStatDescriptor = (
	id: string,
	descriptor: SessionMetadataDescriptor | undefined,
): RegistryMetadataDescriptor => mergeDescriptor(id, descriptor);

export const buildStatMetadata = (
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> => {
	const record: Record<string, RegistryMetadataDescriptor> = {};
	if (descriptors) {
		for (const [id, descriptor] of Object.entries(descriptors)) {
			record[id] = buildStatDescriptor(id, descriptor);
		}
	}
	return createLookup(record, (id) =>
		buildStatDescriptor(id, descriptors?.[id]),
	);
};

const createPhaseStep = (
	phaseId: string,
	step: SessionPhaseStepMetadata,
): PhaseStepMetadata => {
	const triggers = freezeArray([...(step.triggers ?? [])]);
	return Object.freeze({
		id: step.id,
		label: step.label ?? formatFallbackLabel(step.id),
		...(step.icon !== undefined ? { icon: step.icon } : {}),
		triggers,
	});
};

const toPhaseMetadata = (
	id: string,
	metadata: SessionPhaseMetadata | undefined,
): PhaseMetadata => {
	const steps = metadata?.steps
		? metadata.steps.map((step) => createPhaseStep(id, step))
		: [];
	const stepsById = Object.fromEntries(
		steps.map((step) => [step.id, step] as const),
	);
	return Object.freeze({
		id,
		label: metadata?.label ?? formatFallbackLabel(id),
		action: metadata?.action ?? false,
		...(metadata?.icon !== undefined ? { icon: metadata.icon } : {}),
		steps: freezeArray(steps),
		stepsById: freezeRecord(stepsById),
	});
};

export const buildPhaseMetadata = (
	phases: SessionSnapshotMetadata['phases'],
): MetadataLookup<PhaseMetadata> => {
	const record: Record<string, PhaseMetadata> = {};
	if (phases) {
		for (const [id, metadata] of Object.entries(phases)) {
			record[id] = toPhaseMetadata(id, metadata);
		}
	}
	return createLookup(record, (id) => toPhaseMetadata(id, phases?.[id]));
};

const toTriggerMetadata = (
	id: string,
	metadata: SessionTriggerMetadata | undefined,
): TriggerMetadata =>
	Object.freeze({
		id,
		label: metadata?.label ?? formatFallbackLabel(id),
		...(metadata?.icon !== undefined ? { icon: metadata.icon } : {}),
		...(metadata?.description !== undefined
			? { description: metadata.description }
			: {}),
		...(metadata?.future !== undefined ? { future: metadata.future } : {}),
		...(metadata?.past !== undefined ? { past: metadata.past } : {}),
	});

export const buildTriggerMetadata = (
	triggers: SessionSnapshotMetadata['triggers'],
): MetadataLookup<TriggerMetadata> => {
	const record: Record<string, TriggerMetadata> = {};
	if (triggers) {
		for (const [id, metadata] of Object.entries(triggers)) {
			record[id] = toTriggerMetadata(id, metadata);
		}
	}
	return createLookup(record, (id) => toTriggerMetadata(id, triggers?.[id]));
};

const createAssetDescriptor = (
	type: string,
	descriptor: SessionMetadataDescriptor | undefined,
	fallback: AssetMetadata,
): AssetMetadata => {
	const merged = mergeDescriptor(
		type,
		descriptor,
		fallback.label,
		fallback.icon,
		fallback.description,
	);
	return Object.freeze({ ...fallback, ...merged });
};

export const DEFAULT_LAND_DESCRIPTOR: AssetMetadata = Object.freeze({
	id: 'land',
	label: 'Land',
	icon: '🗺️',
});

export const DEFAULT_SLOT_DESCRIPTOR: AssetMetadata = Object.freeze({
	id: 'slot',
	label: 'Development Slot',
	icon: '➕',
});

export const DEFAULT_PASSIVE_DESCRIPTOR: AssetMetadata = Object.freeze({
	id: 'passive',
	label: 'Passive Effect',
	icon: '✨',
});

export const resolveAssetDescriptor = (
	type: string,
	descriptor: SessionMetadataDescriptor | undefined,
	fallback: AssetMetadata,
): AssetMetadata => createAssetDescriptor(type, descriptor, fallback);
