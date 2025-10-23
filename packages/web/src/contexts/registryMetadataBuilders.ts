import type { Registry } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionResourceDefinition,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import type { TranslationResourceV2Registry } from '../translation/context';
import type {
	MetadataLookup,
	PhaseMetadata,
	PhaseStepMetadata,
	RegistryMetadataDescriptor,
	TriggerMetadata,
} from './registryMetadataTypes';

type RegistryEntry = readonly [string, RegistryMetadataDescriptor];

type RegistryDescriptorFallbackFactory<TDefinition> = (
	definition: TDefinition,
) => RegistryDescriptorFallback;

const freezeArray = <TValue>(values: Iterable<TValue>): ReadonlyArray<TValue> =>
	Object.freeze(Array.from(values));

const freezeRecord = <TValue>(record: Record<string, TValue>) =>
	Object.freeze({ ...record }) as Readonly<Record<string, TValue>>;

export const formatLabel = (value: string): string => {
	const spaced = value.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const createLookup = <TDescriptor extends { id: string }>(
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
	return Object.freeze(lookup);
};

export interface RegistryDescriptorFallback {
	label?: string | undefined;
	icon?: string | undefined;
	description?: string | undefined;
}

export const createRegistryDescriptor = (
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
	const triggers = freezeArray(triggerSource);
	const icon = step.icon;
	const label = step.label ?? formatLabel(step.id);
	const entry: PhaseStepMetadata = {
		id: step.id,
		icon,
		label,
		triggers,
	};
	return Object.freeze(entry);
};

export const createPhaseDescriptor = (
	id: string,
	phase: SessionPhaseMetadata | undefined,
): PhaseMetadata => {
	const icon = phase?.icon;
	const label = phase?.label ?? formatLabel(id);
	const action = Boolean(phase?.action);
	const steps = freezeArray(
		(phase?.steps ?? []).map((step) => createPhaseStep(step)),
	);
	const stepsById = freezeRecord(
		Object.fromEntries(steps.map((step) => [step.id, step])),
	);
	return Object.freeze({ id, action, icon, label, steps, stepsById });
};

export const createTriggerDescriptor = (
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

const mergeRegistryEntries = <TDefinition extends { id: string }>(
	registry: Registry<TDefinition>,
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
	extractFallback: RegistryDescriptorFallbackFactory<TDefinition>,
): Iterable<RegistryEntry> => {
	const entries: Array<RegistryEntry> = [];
	const processed = new Set<string>();
	for (const [id, definition] of registry.entries()) {
		const descriptor = createRegistryDescriptor(
			id,
			metadata?.[id],
			extractFallback(definition),
		);
		entries.push([id, descriptor]);
		processed.add(id);
	}
	if (metadata) {
		for (const [id, descriptor] of Object.entries(metadata)) {
			if (processed.has(id)) {
				continue;
			}
			entries.push([id, createRegistryDescriptor(id, descriptor, {})]);
		}
	}
	return entries;
};

const mergeResourceEntries = (
	resources: Record<string, SessionResourceDefinition>,
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
	resourceV2?: TranslationResourceV2Registry,
): Iterable<RegistryEntry> => {
	const entries: Array<RegistryEntry> = [];
	const processed = new Set<string>();
	for (const [key, definition] of Object.entries(resources)) {
		const resource = resourceV2?.getResource(key);
		const parent = resourceV2?.getParentForResource(key);
		const descriptor = createRegistryDescriptor(key, metadata?.[key], {
			label:
				resource?.display.name ?? definition.label ?? definition.key ?? key,
			icon: resource?.display.icon ?? parent?.display.icon ?? definition.icon,
			description:
				resource?.display.description ??
				parent?.display.description ??
				definition.description,
		});
		entries.push([key, descriptor]);
		processed.add(key);
	}
	if (resourceV2) {
		for (const resource of resourceV2.listResources()) {
			if (processed.has(resource.id)) {
				continue;
			}
			const parent = resourceV2.getParentForResource(resource.id);
			const descriptor = createRegistryDescriptor(
				resource.id,
				metadata?.[resource.id],
				{
					label: resource.display.name ?? resource.id,
					icon: resource.display.icon ?? parent?.display.icon,
					description:
						resource.display.description ?? parent?.display.description,
				},
			);
			entries.push([resource.id, descriptor]);
			processed.add(resource.id);
		}
	}
	if (metadata) {
		for (const [key, descriptor] of Object.entries(metadata)) {
			if (processed.has(key)) {
				continue;
			}
			entries.push([key, createRegistryDescriptor(key, descriptor, {})]);
		}
	}
	return entries;
};

export const buildResourceMetadata = (
	resources: Record<string, SessionResourceDefinition>,
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
	resourceV2?: TranslationResourceV2Registry,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createLookup(
		mergeResourceEntries(resources, metadata, resourceV2),
		(id: string) =>
			createRegistryDescriptor(id, undefined, {
				label: formatLabel(id),
			}),
	);

export const buildRegistryMetadata = <
	TDefinition extends {
		id: string;
		name?: string | undefined;
		icon?: string | undefined;
		description?: string | undefined;
	},
>(
	registry: Registry<TDefinition>,
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createLookup(
		mergeRegistryEntries(registry, metadata, (definition) => ({
			label: definition.name,
			icon: definition.icon,
			description: definition.description,
		})),
		(id: string) =>
			createRegistryDescriptor(id, undefined, {
				label: formatLabel(id),
			}),
	);

export const buildStatMetadata = (
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
): MetadataLookup<RegistryMetadataDescriptor> =>
	createLookup(
		metadata
			? Object.entries(metadata).map(([id, descriptor]) => [
					id,
					createRegistryDescriptor(id, descriptor, {}),
				])
			: [],
		(id: string) =>
			createRegistryDescriptor(id, undefined, {
				label: formatLabel(id),
			}),
	);

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
