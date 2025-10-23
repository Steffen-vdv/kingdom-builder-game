import type { RegistryMetadataDescriptor } from '../../contexts/RegistryMetadataContext';
import type { TranslationIconLabel } from '../../translation/context/types';

export interface DescriptorDisplay {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	displayAsPercent?: boolean;
	metadata?: Readonly<Record<string, unknown>>;
	limited?: boolean;
	groupId?: string;
	parentId?: string;
	isPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	lowerBound?: number;
	upperBound?: number;
	tierTrack?: RegistryMetadataDescriptor['tierTrack'];
	globalActionCost?: RegistryMetadataDescriptor['globalActionCost'];
	relation?: RegistryMetadataDescriptor['relation'];
	children?: RegistryMetadataDescriptor['children'];
	order?: number;
}

const resolveLabel = (label: string | undefined, fallback: string): string => {
	const trimmed = label?.trim();
	if (trimmed && trimmed.length > 0) {
		return trimmed;
	}
	return fallback;
};

export const toDescriptorDisplay = (
	descriptor: RegistryMetadataDescriptor,
): DescriptorDisplay => {
	const entry: DescriptorDisplay = {
		id: descriptor.id,
		label: resolveLabel(descriptor.label, descriptor.id),
	};
	if (descriptor.icon !== undefined) {
		entry.icon = descriptor.icon;
	}
	if (descriptor.description !== undefined) {
		entry.description = descriptor.description;
	}
	if (descriptor.displayAsPercent !== undefined) {
		entry.displayAsPercent = descriptor.displayAsPercent;
	}
	if (descriptor.metadata !== undefined) {
		entry.metadata = descriptor.metadata;
	}
	if (descriptor.limited !== undefined) {
		entry.limited = descriptor.limited;
	}
	if (descriptor.groupId !== undefined) {
		entry.groupId = descriptor.groupId;
	}
	if (descriptor.parentId !== undefined) {
		entry.parentId = descriptor.parentId;
	}
	if (descriptor.isPercent !== undefined) {
		entry.isPercent = descriptor.isPercent;
	}
	if (descriptor.trackValueBreakdown !== undefined) {
		entry.trackValueBreakdown = descriptor.trackValueBreakdown;
	}
	if (descriptor.trackBoundBreakdown !== undefined) {
		entry.trackBoundBreakdown = descriptor.trackBoundBreakdown;
	}
	if (descriptor.lowerBound !== undefined) {
		entry.lowerBound = descriptor.lowerBound;
	}
	if (descriptor.upperBound !== undefined) {
		entry.upperBound = descriptor.upperBound;
	}
	if (descriptor.tierTrack !== undefined) {
		entry.tierTrack = descriptor.tierTrack;
	}
	if (descriptor.globalActionCost !== undefined) {
		entry.globalActionCost = descriptor.globalActionCost;
	}
	if (descriptor.relation !== undefined) {
		entry.relation = descriptor.relation;
	}
	if (descriptor.children !== undefined) {
		entry.children = descriptor.children;
	}
	if (descriptor.order !== undefined) {
		entry.order = descriptor.order;
	}
	return entry;
};

export const toAssetDisplay = (
	asset: TranslationIconLabel | undefined,
	fallbackId: string,
): DescriptorDisplay => {
	const entry: DescriptorDisplay = {
		id: fallbackId,
		label: resolveLabel(asset?.label, fallbackId),
	};
	if (asset?.icon !== undefined) {
		entry.icon = asset.icon;
	}
	if (asset?.description !== undefined) {
		entry.description = asset.description;
	}
	return entry;
};

export const formatIconLabel = (descriptor: DescriptorDisplay): string => {
	const base = descriptor.label || descriptor.id;
	if (descriptor.icon) {
		return `${descriptor.icon} ${base}`.trim();
	}
	return base;
};

export const formatDescriptorSummary = (
	descriptor: DescriptorDisplay,
): string => {
	const base = formatIconLabel(descriptor);
	if (descriptor.description) {
		return `${base} - ${descriptor.description}`.trim();
	}
	return base;
};
