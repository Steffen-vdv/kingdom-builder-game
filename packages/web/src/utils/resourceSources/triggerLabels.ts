import type { TranslationAssets } from '../../translation/context';
import { selectTriggerDisplay } from '../../translation/context';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

function coerceTriggerLabel(
	assets: TranslationAssets | undefined,
	id?: string,
): ResolveResult {
	if (!id) {
		throw new Error('Trigger ID is required to resolve trigger label.');
	}
	const asset = selectTriggerDisplay(assets, id);
	const icon = typeof asset.icon === 'string' ? asset.icon : '';
	const label = asset.text ?? asset.label;
	if (!label) {
		throw new Error(
			`Trigger "${id}" is missing text and label. ` +
				'At least one must be defined.',
		);
	}
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
