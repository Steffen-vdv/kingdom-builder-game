import type {
	Registry,
	ResourceV2GlobalActionCost,
	ResourceV2GroupParent,
	ResourceV2TierTrack,
} from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionMetadataFormat,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import type {
	AssetMetadata,
	MetadataLookup,
	PhaseMetadata,
	PhaseStepMetadata,
	RegistryMetadataDescriptor,
	TriggerMetadata,
} from './registryMetadataTypes';
import { clone } from '../state/clone';

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
	const frozenLookup = Object.freeze(lookup);
	return frozenLookup;
};

export interface RegistryDescriptorFallback {
	label?: string | undefined;
	icon?: string | undefined;
	description?: string | undefined;
	displayAsPercent?: boolean | undefined;
	format?: SessionMetadataFormat | undefined;
	metadata?: Record<string, unknown> | undefined;
	limited?: boolean | undefined;
	groupId?: string | undefined;
	parentId?: string | undefined;
	isPercent?: boolean | undefined;
	trackValueBreakdown?: boolean | undefined;
	trackBoundBreakdown?: boolean | undefined;
	lowerBound?: number | undefined;
	upperBound?: number | undefined;
	tierTrack?: ResourceV2TierTrack | undefined;
	globalActionCost?: ResourceV2GlobalActionCost | undefined;
	relation?: ResourceV2GroupParent['relation'] | undefined;
	children?: ReadonlyArray<string> | undefined;
	order?: number | undefined;
}

const cloneAndFreeze = <T>(value: T | undefined): T | undefined => {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value === 'object' && value !== null) {
		return Object.freeze(clone(value)) as T;
	}
	return value;
};

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
	const displayAsPercent =
		descriptor?.displayAsPercent ?? fallback.displayAsPercent;
	if (displayAsPercent !== undefined) {
		entry.displayAsPercent = displayAsPercent;
	}
	const format = descriptor?.format ?? fallback.format;
	if (format !== undefined) {
		entry.format = format;
	}
	const metadata = cloneAndFreeze(fallback.metadata);
	if (metadata !== undefined) {
		entry.metadata = metadata as Readonly<Record<string, unknown>>;
	}
	if (fallback.limited !== undefined) {
		entry.limited = fallback.limited;
	}
	if (fallback.groupId !== undefined) {
		entry.groupId = fallback.groupId;
	}
	if (fallback.parentId !== undefined) {
		entry.parentId = fallback.parentId;
	}
	if (fallback.isPercent !== undefined) {
		entry.isPercent = fallback.isPercent;
	}
	if (fallback.trackValueBreakdown !== undefined) {
		entry.trackValueBreakdown = fallback.trackValueBreakdown;
	}
	if (fallback.trackBoundBreakdown !== undefined) {
		entry.trackBoundBreakdown = fallback.trackBoundBreakdown;
	}
	if (fallback.lowerBound !== undefined) {
		entry.lowerBound = fallback.lowerBound;
	}
	if (fallback.upperBound !== undefined) {
		entry.upperBound = fallback.upperBound;
	}
	const tierTrack = cloneAndFreeze(fallback.tierTrack);
	if (tierTrack !== undefined) {
		entry.tierTrack = tierTrack as Readonly<ResourceV2TierTrack>;
	}
	const globalActionCost = cloneAndFreeze(fallback.globalActionCost);
	if (globalActionCost !== undefined) {
		entry.globalActionCost =
			globalActionCost as Readonly<ResourceV2GlobalActionCost>;
	}
	if (fallback.relation !== undefined) {
		entry.relation = fallback.relation;
	}
	if (fallback.children !== undefined) {
		entry.children = freezeArray(fallback.children);
	}
	if (fallback.order !== undefined) {
		entry.order = fallback.order;
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

const mergeRegistryEntries = <TDefinition extends { id: string }>(
	registry: Registry<TDefinition>,
	metadata: Record<string, SessionMetadataDescriptor> | undefined,
	extractFallback: (definition: TDefinition) => RegistryDescriptorFallback,
): Iterable<readonly [string, RegistryMetadataDescriptor]> => {
	const entries: Array<readonly [string, RegistryMetadataDescriptor]> = [];
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
			createRegistryDescriptor(id, undefined, { label: formatLabel(id) }),
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
			createRegistryDescriptor(id, undefined, { label: formatLabel(id) }),
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

export const resolveAssetDescriptor = (
	id: string,
	descriptor: SessionMetadataDescriptor | undefined,
	fallback?: AssetMetadata,
): AssetMetadata => {
	if (!descriptor && !fallback) {
		throw new Error(
			`Missing descriptor for asset "${id}". ` +
				'Provide metadata for the asset or a fallback descriptor.',
		);
	}
	const entry: AssetMetadata = {
		id,
		label: descriptor?.label ?? fallback?.label ?? formatLabel(id),
	};
	const icon = descriptor?.icon ?? fallback?.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const description = descriptor?.description ?? fallback?.description;
	if (description !== undefined) {
		entry.description = description;
	}
	return Object.freeze(entry);
};
