import type { EngineRegistryMetadataSources } from '@kingdom-builder/engine';
import type {
	SessionMetadataDescriptor,
	SessionResourceDefinition,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol';
import type { SessionOverviewContent } from '@kingdom-builder/protocol/session';
import {
	STATS,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';

type TriggerInfoEntry = {
	icon?: string;
	future?: string;
	past?: string;
};

const formatLabel = (value: string): string => {
	const spaced = value.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

const cloneDescriptorRecord = (
	source: Record<string, SessionMetadataDescriptor> | undefined,
): Record<string, SessionMetadataDescriptor> => {
	if (!source) {
		return {};
	}
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, descriptor] of Object.entries(source)) {
		record[key] = structuredClone(descriptor);
	}
	return record;
};

const cloneTriggerRecord = (
	source: Record<string, SessionTriggerMetadata> | undefined,
): Record<string, SessionTriggerMetadata> => {
	if (!source) {
		return {};
	}
	const record: Record<string, SessionTriggerMetadata> = {};
	for (const [key, descriptor] of Object.entries(source)) {
		record[key] = structuredClone(descriptor);
	}
	return record;
};

const buildResourceMetadataSources = (
	registry: Record<string, SessionResourceDefinition>,
): Record<string, SessionMetadataDescriptor> => {
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, definition] of Object.entries(registry)) {
		const label = definition.label ?? formatLabel(key);
		const descriptor: SessionMetadataDescriptor = { label };
		if (definition.icon !== undefined) {
			descriptor.icon = definition.icon;
		}
		if (definition.description !== undefined) {
			descriptor.description = definition.description;
		}
		record[key] = descriptor;
	}
	return record;
};

const buildStatMetadataSources = (): Record<
	string,
	SessionMetadataDescriptor
> => {
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(STATS)) {
		if (!info) {
			continue;
		}
		const descriptor: SessionMetadataDescriptor = { label: info.label };
		if (info.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info.description !== undefined) {
			descriptor.description = info.description;
		}
		record[key] = descriptor;
	}
	return record;
};

const buildTriggerMetadataSources = (): Record<
	string,
	SessionTriggerMetadata
> => {
	const record: Record<string, SessionTriggerMetadata> = {};
	for (const [key, info] of Object.entries(TRIGGER_INFO) as Array<
		[string, TriggerInfoEntry | undefined]
	>) {
		if (!info) {
			continue;
		}
		const descriptor: SessionTriggerMetadata = {
			label: info.past ?? info.future ?? formatLabel(key),
		};
		if (info.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info.future !== undefined) {
			descriptor.future = info.future;
		}
		if (info.past !== undefined) {
			descriptor.past = info.past;
		}
		record[key] = descriptor;
	}
	return record;
};

const buildAssetMetadataSources = (): Record<
	string,
	SessionMetadataDescriptor
> => ({
	land: { label: LAND_INFO.label, icon: LAND_INFO.icon },
	slot: { label: SLOT_INFO.label, icon: SLOT_INFO.icon },
	passive: { label: PASSIVE_INFO.label, icon: PASSIVE_INFO.icon },
});

export const createMetadataSources = (
	resourceRegistry: Record<string, SessionResourceDefinition>,
	overrides?: EngineRegistryMetadataSources,
): EngineRegistryMetadataSources => {
	const resources = buildResourceMetadataSources(resourceRegistry);
	const stats = buildStatMetadataSources();
	const triggers = buildTriggerMetadataSources();
	const assets = buildAssetMetadataSources();
	Object.assign(resources, cloneDescriptorRecord(overrides?.resources));
	Object.assign(stats, cloneDescriptorRecord(overrides?.stats));
	Object.assign(triggers, cloneTriggerRecord(overrides?.triggers));
	Object.assign(assets, cloneDescriptorRecord(overrides?.assets));
	const overviewContent: SessionOverviewContent = overrides?.overviewContent
		? structuredClone(overrides.overviewContent)
		: structuredClone(OVERVIEW_CONTENT);
	return {
		resources,
		stats,
		triggers,
		assets,
		overviewContent,
	};
};

export { formatLabel };
