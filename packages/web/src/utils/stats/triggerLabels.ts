import type { TranslationAssets } from '../../translation/context';
import { selectTriggerDisplay } from '../../translation/context/assetSelectors';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

export function resolveTriggerDescriptor(
	assets: TranslationAssets | undefined,
	id?: string,
): ResolveResult {
	if (id) {
		const info = selectTriggerDisplay(assets, id);
		const label = info.past ?? info.label ?? id;
		return {
			icon: info.icon ?? '',
			label,
		} satisfies ResolveResult;
	}
	return { icon: '', label: 'Trigger' } satisfies ResolveResult;
}

export function createTriggerDescriptorEntry(
	assets: TranslationAssets | undefined,
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
): DescriptorRegistryEntry {
	return {
		resolve: (id) => resolveTriggerDescriptor(assets, id),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function formatTriggerLabel(
	id: string,
	assets?: TranslationAssets,
): string | undefined {
	if (!id) {
		return undefined;
	}
	const info = selectTriggerDisplay(assets, id);
	const parts: string[] = [];
	if (info.icon) {
		parts.push(info.icon);
	}
	const label = info.past ?? info.label ?? id;
	if (label) {
		parts.push(label);
	}
	const resolved = parts.join(' ').trim();
	return resolved.length ? resolved : undefined;
}
