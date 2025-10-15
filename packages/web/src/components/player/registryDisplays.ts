import type { RegistryMetadataDescriptor } from '../../contexts/RegistryMetadataContext';
import type { TranslationIconLabel } from '../../translation/context/types';

export interface DescriptorDisplay {
	id: string;
	label: string;
	icon?: string;
	description?: string;
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
