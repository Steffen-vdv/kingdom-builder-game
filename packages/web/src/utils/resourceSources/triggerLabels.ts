import type { TranslationAssets } from '../../translation/context';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

function coerceTriggerLabel(
	assets: TranslationAssets | undefined,
	id?: string,
): ResolveResult {
	if (!id) {
		return {
			icon: '',
			label: '',
		} satisfies ResolveResult;
	}
	const asset = assets?.triggers?.[id];
	if (!asset) {
		// Graceful fallback when trigger metadata is missing
		return {
			icon: '',
			label: id,
		} satisfies ResolveResult;
	}
	const icon = typeof asset.icon === 'string' ? asset.icon : '';
	// After migration, prefer text over label for display
	const label = asset.text ?? asset.label ?? id;
	return {
		icon,
		label,
	} satisfies ResolveResult;
}

export function resolveTriggerDescriptor(
	assets: TranslationAssets | undefined,
	id?: string,
): ResolveResult {
	return coerceTriggerLabel(assets, id);
}

export function createTriggerDescriptorEntry(
	assets: TranslationAssets,
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
): DescriptorRegistryEntry {
	return {
		resolve: (id) => resolveTriggerDescriptor(assets, id),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function formatTriggerLabel(
	assets: TranslationAssets | undefined,
	id: string,
): string | undefined {
	if (!id) {
		return undefined;
	}
	const descriptor = resolveTriggerDescriptor(assets, id);
	const parts: string[] = [];
	if (descriptor.icon) {
		parts.push(descriptor.icon);
	}
	if (descriptor.label) {
		parts.push(descriptor.label);
	}
	const label = parts.join(' ').trim();
	return label || undefined;
}
