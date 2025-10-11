import type { TranslationAssets } from '../../translation/context';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

type TriggerInfo = Readonly<{ icon?: string; future?: string; past?: string }>;

function resolveTrigger(assets: TranslationAssets, id?: string): ResolveResult {
	if (!id) {
		return { icon: '', label: 'Trigger' } satisfies ResolveResult;
	}
	const info = assets.triggers?.[id];
	if (info) {
		return {
			icon: info.icon ?? '',
			label: info.past ?? info.future ?? id,
		} satisfies ResolveResult;
	}
	return { icon: '', label: id } satisfies ResolveResult;
}

function formatTriggerParts(info: TriggerInfo | undefined, id: string): string {
	if (!info) {
		return id;
	}
	const parts: string[] = [];
	if (info.icon) {
		parts.push(info.icon);
	}
	const label = info.past ?? info.future ?? id;
	if (label) {
		parts.push(label);
	}
	const text = parts.join(' ').trim();
	return text || id;
}

export function createTriggerDescriptorEntry(
	assets: TranslationAssets,
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
): DescriptorRegistryEntry {
	return {
		resolve: (id) => resolveTrigger(assets, id),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function formatTriggerLabel(
	assets: TranslationAssets,
	id: string,
): string | undefined {
	if (!id) {
		return undefined;
	}
	const info = assets.triggers?.[id];
	return formatTriggerParts(info, id);
}
