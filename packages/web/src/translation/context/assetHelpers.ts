import type { PopulationConfig } from '@kingdom-builder/protocol';
import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../state/sessionRegistries';
import type {
	TranslationIconLabel,
	TranslationResourceV2Registry,
} from './types';

type FormatAwareDescriptor = SessionMetadataDescriptor & {
	displayAsPercent?: boolean;
	format?: SessionMetadataDescriptor['format'];
};

export const formatRemoval = (description: string): string =>
	`Active as long as ${description}`;

export function mergeIconLabel(
	base: TranslationIconLabel | undefined,
	descriptor: SessionMetadataDescriptor | undefined,
	fallbackLabel: string,
): TranslationIconLabel {
	const entry: TranslationIconLabel = {};
	const icon = descriptor?.icon ?? base?.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const label = descriptor?.label ?? base?.label ?? fallbackLabel;
	if (label !== undefined) {
		entry.label = label;
	}
	const description = descriptor?.description ?? base?.description;
	if (description !== undefined) {
		entry.description = description;
	}
	const percentFlag = (descriptor as FormatAwareDescriptor | undefined)
		?.displayAsPercent;
	if (percentFlag !== undefined) {
		entry.displayAsPercent = percentFlag;
	} else if (base?.displayAsPercent !== undefined) {
		entry.displayAsPercent = base.displayAsPercent;
	}
	const format = (descriptor as FormatAwareDescriptor | undefined)?.format;
	const baseFormat = base?.format;
	const appliedFormat = format ?? baseFormat;
	if (appliedFormat !== undefined) {
		if (typeof appliedFormat === 'string') {
			entry.format = appliedFormat;
		} else {
			entry.format = Object.freeze({ ...appliedFormat });
		}
	}
	return Object.freeze(entry);
}

function toIconLabel(
	definition: Partial<PopulationConfig> & {
		id?: string;
		icon?: string | undefined;
		name?: string | undefined;
		label?: string | undefined;
		description?: string | undefined;
	},
	fallbackId: string,
): TranslationIconLabel {
	const label = definition.name ?? definition.label ?? fallbackId;
	const entry: TranslationIconLabel = {};
	if (definition.icon !== undefined) {
		entry.icon = definition.icon;
	}
	if (label !== undefined) {
		entry.label = label;
	}
	if (definition.description !== undefined) {
		entry.description = definition.description;
	}
	return Object.freeze(entry);
}

export function buildPopulationMap(
	registry: SessionRegistries['populations'],
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [id, definition] of registry.entries()) {
		const base = toIconLabel(definition, id);
		entries[id] = mergeIconLabel(base, descriptors?.[id], base.label ?? id);
	}
	return Object.freeze(entries);
}

function pickResourceDescriptorOverrides(
	entry: TranslationIconLabel,
	descriptor: SessionMetadataDescriptor | undefined,
): SessionMetadataDescriptor | undefined {
	if (!descriptor) {
		return undefined;
	}
	const override: SessionMetadataDescriptor = {};
	if (entry.icon === undefined && descriptor.icon !== undefined) {
		override.icon = descriptor.icon;
	}
	if (entry.label === undefined && descriptor.label !== undefined) {
		override.label = descriptor.label;
	}
	if (entry.description === undefined && descriptor.description !== undefined) {
		override.description = descriptor.description;
	}
	if (
		entry.displayAsPercent === undefined &&
		descriptor.displayAsPercent !== undefined
	) {
		override.displayAsPercent = descriptor.displayAsPercent;
	}
	if (descriptor.format !== undefined) {
		override.format = descriptor.format;
	}
	return Object.keys(override as Record<string, unknown>).length > 0
		? override
		: undefined;
}

export function buildResourceMap(
	resources: SessionRegistries['resources'],
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
	resourceV2?: TranslationResourceV2Registry,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [key, definition] of Object.entries(resources)) {
		const entry: TranslationIconLabel = {};
		const resource = resourceV2?.getResource(key);
		const parent = resourceV2?.getParentForResource(key);
		if (resource) {
			const display = resource.display;
			entry.label = display.name ?? definition.label ?? definition.key ?? key;
			if (display.icon !== undefined) {
				entry.icon = display.icon;
			}
			if (display.description !== undefined) {
				entry.description = display.description;
			}
			if (display.displayAsPercent !== undefined) {
				entry.displayAsPercent = display.displayAsPercent;
			}
			if (
				entry.description === undefined &&
				definition.description !== undefined
			) {
				entry.description = definition.description;
			}
			if (entry.icon === undefined && definition.icon !== undefined) {
				entry.icon = definition.icon;
			}
			if (
				entry.displayAsPercent === undefined &&
				parent?.display.displayAsPercent !== undefined
			) {
				entry.displayAsPercent = parent.display.displayAsPercent;
			}
			if (entry.icon === undefined && parent?.display.icon !== undefined) {
				entry.icon = parent.display.icon;
			}
			if (
				entry.description === undefined &&
				parent?.display.description !== undefined
			) {
				entry.description = parent.display.description;
			}
		} else {
			if (definition.icon !== undefined) {
				entry.icon = definition.icon;
			}
			entry.label = definition.label ?? definition.key ?? key;
			if (definition.description !== undefined) {
				entry.description = definition.description;
			}
		}
		const descriptor = descriptors?.[key];
		const descriptorForMerge = resource
			? pickResourceDescriptorOverrides(entry, descriptor)
			: descriptor;
		entries[key] = mergeIconLabel(
			entry,
			descriptorForMerge,
			entry.label ?? key,
		);
	}
	if (resourceV2) {
		for (const resource of resourceV2.listResources()) {
			if (entries[resource.id]) {
				continue;
			}
			const parent = resourceV2.getParentForResource(resource.id);
			const entry: TranslationIconLabel = {
				label: resource.display.name ?? resource.id,
			};
			if (resource.display.icon !== undefined) {
				entry.icon = resource.display.icon;
			} else if (parent?.display.icon !== undefined) {
				entry.icon = parent.display.icon;
			}
			if (resource.display.description !== undefined) {
				entry.description = resource.display.description;
			} else if (parent?.display.description !== undefined) {
				entry.description = parent.display.description;
			}
			if (resource.display.displayAsPercent !== undefined) {
				entry.displayAsPercent = resource.display.displayAsPercent;
			} else if (parent?.display.displayAsPercent !== undefined) {
				entry.displayAsPercent = parent.display.displayAsPercent;
			}
			const descriptor = descriptors?.[resource.id];
			const descriptorForMerge = pickResourceDescriptorOverrides(
				entry,
				descriptor,
			);
			entries[resource.id] = mergeIconLabel(
				entry,
				descriptorForMerge,
				entry.label ?? resource.id,
			);
		}
	}
	return Object.freeze(entries);
}
