import type { TranslationAssets } from '../../translation/context';
import { selectTriggerDisplay } from '../../translation/context';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

const DEFAULT_TRIGGER_LABEL = 'Trigger';

function coerceTriggerLabel(
	assets: TranslationAssets | undefined,
	id?: string,
): ResolveResult {
	if (!id) {
		return { icon: '', label: DEFAULT_TRIGGER_LABEL } satisfies ResolveResult;
	}
	const asset = selectTriggerDisplay(assets, id);
	const icon = typeof asset.icon === 'string' ? asset.icon : '';
	const fallbackLabel = id ?? DEFAULT_TRIGGER_LABEL;
	const label = [asset.past, asset.future, asset.label, fallbackLabel].find(
		(value): value is string =>
			typeof value === 'string' && value.trim().length > 0,
	);
	return {
		icon,
		label: label ?? fallbackLabel,
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
