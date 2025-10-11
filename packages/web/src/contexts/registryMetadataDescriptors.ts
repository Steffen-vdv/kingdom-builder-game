import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import type { Registry } from '@kingdom-builder/protocol';
import type {
	AssetMetadata,
	AssetMetadataDescriptor,
	MetadataLookup,
	PhaseMetadata,
	PhaseMetadataDescriptor,
	PhaseMetadataDescriptorRecord,
	PhaseStepDescriptor,
	PhaseStepMetadata,
	RegistryMetadataDescriptor,
	RegistryMetadataDescriptorRecord,
	SessionMetadataDescriptor,
	TriggerMetadata,
	TriggerMetadataDescriptor,
	TriggerMetadataDescriptorRecord,
} from './registryMetadataTypes';
export * from './registryMetadataTypes';

const formatFallbackLabel = (value: string): string => {
	const spaced = value.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

const freeze = <T extends object>(value: T): T => Object.freeze(value);
const freezeArray = <T>(values: Iterable<T>): ReadonlyArray<T> =>
	freeze(Array.from(values));

const createRecordView = <T>(
	map: Map<string, T>,
): Readonly<Record<string, T>> =>
	new Proxy(Object.create(null) as Record<string, T>, {
		get: (_target, key: string | symbol) =>
			typeof key === 'string' ? map.get(key) : undefined,
		has: (_target, key: string | symbol) =>
			typeof key === 'string' && map.has(key),
		ownKeys: () => Array.from(map.keys()),
		getOwnPropertyDescriptor: (_target, key: string | symbol) => {
			if (typeof key !== 'string') {
				return undefined;
			}
			const value = map.get(key);
			if (value === undefined) {
				return undefined;
			}
			return {
				configurable: true,
				enumerable: true,
				writable: false,
				value,
			};
		},
	});

const createMetadataLookup = <TDescriptor>(
	entries: Iterable<readonly [string, TDescriptor]>,
	factory: (id: string) => TDescriptor,
): MetadataLookup<TDescriptor> => {
	const map = new Map<string, TDescriptor>();
	for (const [id, descriptor] of entries) {
		map.set(id, descriptor);
	}
	const record = createRecordView(map);
	const get = (id: string): TDescriptor => {
		const existing = map.get(id);
		if (existing !== undefined) {
			return existing;
		}
		const created = factory(id);
		map.set(id, created);
		return created;
	};
	return freeze({
		record,
		get,
		values: () => freezeArray(map.values()),
	});
};

const createRegistryDescriptor = <
	TDefinition extends {
		id: string;
		name?: string | undefined;
		icon?: string | undefined;
		description?: string | undefined;
	},
>(
	definition: TDefinition,
	descriptor?: SessionMetadataDescriptor,
): RegistryMetadataDescriptor => {
	const label =
		descriptor?.label ?? definition.name ?? formatFallbackLabel(definition.id);
	const icon = descriptor?.icon ?? definition.icon;
	const description = descriptor?.description ?? definition.description;
	const resolved: RegistryMetadataDescriptor = {
		id: definition.id,
		label,
	};
	if (icon !== undefined) {
		resolved.icon = icon;
	}
	if (description !== undefined) {
		resolved.description = description;
	}
	return freeze(resolved);
};

const createResourceDescriptor = (
	key: string,
	definition?: SessionResourceDefinition,
	descriptor?: SessionMetadataDescriptor,
): RegistryMetadataDescriptor => {
	const label =
		descriptor?.label ??
		definition?.label ??
		definition?.key ??
		formatFallbackLabel(key);
	const icon = descriptor?.icon ?? definition?.icon;
	const description = descriptor?.description ?? definition?.description;
	const resolved: RegistryMetadataDescriptor = { id: key, label };
	if (icon !== undefined) {
		resolved.icon = icon;
	}
	if (description !== undefined) {
		resolved.description = description;
	}
	return freeze(resolved);
};

const createStatDescriptor = (
	id: string,
	descriptor?: SessionMetadataDescriptor,
): RegistryMetadataDescriptor => {
	const label = descriptor?.label ?? formatFallbackLabel(id);
	const resolved: RegistryMetadataDescriptor = { id, label };
	if (descriptor?.icon !== undefined) {
		resolved.icon = descriptor.icon;
	}
	if (descriptor?.description !== undefined) {
		resolved.description = descriptor.description;
	}
	return freeze(resolved);
};

const toPhaseStepMetadata = (
	phaseId: string,
	value: PhaseStepDescriptor | undefined,
	index: number,
): PhaseStepMetadata => {
	const fallbackId = `${phaseId}:step:${index}`;
	const id = value?.id && value.id.length > 0 ? value.id : fallbackId;
	const label = value?.label ?? formatFallbackLabel(id);
	const triggers = Array.isArray(value?.triggers)
		? freezeArray(
				value.triggers.filter(
					(entry): entry is string => typeof entry === 'string',
				),
			)
		: freezeArray([]);
	return freeze({
		id,
		label,
		triggers,
		...(value?.icon !== undefined ? { icon: value.icon } : {}),
		...(value?.description !== undefined
			? { description: value.description }
			: {}),
	});
};

const createPhaseMetadata = (
	id: string,
	descriptor?: PhaseMetadataDescriptor,
): PhaseMetadata => {
	const label = descriptor?.label ?? formatFallbackLabel(id);
	const stepsSource = Array.isArray(descriptor?.steps) ? descriptor?.steps : [];
	const steps = stepsSource.map((step, index) =>
		toPhaseStepMetadata(id, step, index),
	);
	const stepsById = freeze(
		Object.fromEntries(steps.map((step) => [step.id, step])),
	);
	return freeze({
		id,
		label,
		action: Boolean(descriptor?.action),
		steps: freezeArray(steps),
		stepsById,
		...(descriptor?.icon !== undefined ? { icon: descriptor.icon } : {}),
		...(descriptor?.description !== undefined
			? { description: descriptor.description }
			: {}),
	});
};

const createTriggerMetadata = (
	id: string,
	descriptor?: TriggerMetadataDescriptor,
): TriggerMetadata => {
	const label = descriptor?.label ?? formatFallbackLabel(id);
	return freeze({
		id,
		label,
		...(descriptor?.icon !== undefined ? { icon: descriptor.icon } : {}),
		...(descriptor?.description !== undefined
			? { description: descriptor.description }
			: {}),
		...(descriptor?.future !== undefined ? { future: descriptor.future } : {}),
		...(descriptor?.past !== undefined ? { past: descriptor.past } : {}),
	});
};

const fallbackRegistryDescriptor = (id: string): RegistryMetadataDescriptor =>
	createStatDescriptor(id);

export const DEFAULT_LAND_DESCRIPTOR = freeze<AssetMetadata>({
	label: 'Land',
	icon: '🗺️',
});

export const DEFAULT_SLOT_DESCRIPTOR = freeze<AssetMetadata>({
	label: 'Development Slot',
	icon: '🧩',
});

export const DEFAULT_PASSIVE_DESCRIPTOR = freeze<AssetMetadata>({
	label: 'Passive',
	icon: '♾️',
});

export function resolveAssetDescriptor(
	type: string,
	descriptor: AssetMetadataDescriptor | undefined,
	fallback: AssetMetadata,
): AssetMetadata {
	const label =
		descriptor?.label ?? fallback.label ?? formatFallbackLabel(type);
	const resolved: AssetMetadata = { label };
	const icon = descriptor?.icon ?? fallback.icon;
	if (icon !== undefined) {
		resolved.icon = icon;
	}
	const description = descriptor?.description ?? fallback.description;
	if (description !== undefined) {
		resolved.description = description;
	}
	return freeze(resolved);
}

export function buildRegistryMetadata<
	TDefinition extends {
		id: string;
		name?: string | undefined;
		icon?: string | undefined;
		description?: string | undefined;
	},
>(
	registry: Registry<TDefinition>,
	descriptors?: RegistryMetadataDescriptorRecord,
): MetadataLookup<RegistryMetadataDescriptor> {
	const entries = registry.entries().map(([id, definition]) => {
		const descriptor = descriptors?.[id];
		return [id, createRegistryDescriptor(definition, descriptor)] as const;
	});
	return createMetadataLookup(entries, fallbackRegistryDescriptor);
}

export function buildResourceMetadata(
	resources: Record<string, SessionResourceDefinition>,
	descriptors?: RegistryMetadataDescriptorRecord,
): MetadataLookup<RegistryMetadataDescriptor> {
	const entries = Object.entries(resources).map(([id, definition]) => {
		const descriptor = descriptors?.[id];
		return [id, createResourceDescriptor(id, definition, descriptor)] as const;
	});
	return createMetadataLookup(entries, createResourceDescriptor);
}

export function buildStatMetadata(
	descriptors?: RegistryMetadataDescriptorRecord,
): MetadataLookup<RegistryMetadataDescriptor> {
	const entries = descriptors
		? Object.entries(descriptors).map(
				([id, descriptor]) =>
					[id, createStatDescriptor(id, descriptor)] as const,
			)
		: [];
	return createMetadataLookup(entries, createStatDescriptor);
}

export function buildPhaseMetadata(
	descriptors?: PhaseMetadataDescriptorRecord,
): MetadataLookup<PhaseMetadata> {
	const entries = descriptors
		? Object.entries(descriptors).map(
				([id, descriptor]) =>
					[id, createPhaseMetadata(id, descriptor)] as const,
			)
		: [];
	return createMetadataLookup(entries, createPhaseMetadata);
}

export function buildTriggerMetadata(
	descriptors?: TriggerMetadataDescriptorRecord,
): MetadataLookup<TriggerMetadata> {
	const entries = descriptors
		? Object.entries(descriptors).map(
				([id, descriptor]) =>
					[id, createTriggerMetadata(id, descriptor)] as const,
			)
		: [];
	return createMetadataLookup(entries, createTriggerMetadata);
}

export { formatFallbackLabel };
