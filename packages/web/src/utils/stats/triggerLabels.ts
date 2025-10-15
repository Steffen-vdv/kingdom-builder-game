import type { TranslationTriggerAsset } from '../../translation/context';
import { formatDetailText } from './format';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

type TriggerInfoRecord = Record<
	string,
	{ icon?: string; future?: string; past?: string }
>;

type TriggerAssetLookup = () =>
	| Readonly<Record<string, TranslationTriggerAsset>>
	| undefined;

const resolveTriggerInfo = (
	id: string | undefined,
	lookup: TriggerAssetLookup,
): TriggerInfoRecord[string] | undefined => {
	if (!id) {
		return undefined;
	}
	const assets = lookup();
	if (!assets) {
		return undefined;
	}
	const asset = assets[id];
	if (!asset) {
		return undefined;
	}
	return {
		icon: asset.icon,
		future: asset.future,
		past: asset.past ?? asset.label,
	};
};

export function resolveTriggerDescriptor(
	id: string | undefined,
	lookup: TriggerAssetLookup,
): ResolveResult {
	if (id) {
		const info = resolveTriggerInfo(id, lookup);
		if (info) {
			return {
				icon: info.icon ?? '',
				label: info.past ?? info.future ?? formatDetailText(id),
			} satisfies ResolveResult;
		}
		return {
			icon: '',
			label: formatDetailText(id) || id,
		} satisfies ResolveResult;
	}
	return { icon: '', label: 'Trigger' } satisfies ResolveResult;
}

export function createTriggerDescriptorEntry(
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
	lookup: TriggerAssetLookup,
): DescriptorRegistryEntry {
	return {
		resolve: (id?: string) => resolveTriggerDescriptor(id, lookup),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function formatTriggerLabel(
	id: string,
	assets?: Readonly<Record<string, TranslationTriggerAsset>>,
): string | undefined {
	if (!id) {
		return undefined;
	}
	const info = assets?.[id];
	const parts: string[] = [];
	if (info?.icon) {
		parts.push(info.icon);
	}
	const label =
		info?.past ?? info?.label ?? info?.future ?? formatDetailText(id);
	if (label) {
		parts.push(label);
	}
	const combined = parts.join(' ').trim();
	return combined || id;
}
