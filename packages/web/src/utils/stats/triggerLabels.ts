import type { TranslationTriggerAsset } from '../../translation/context/types';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

export type TriggerLookup = Readonly<Record<string, TranslationTriggerAsset>>;

export function resolveTriggerDescriptor(
	lookup: TriggerLookup,
	id?: string,
): ResolveResult {
	if (id) {
		const info = lookup[id];
		if (info) {
			const icon =
				typeof info.icon === 'string' && info.icon.trim().length > 0
					? info.icon
					: '';
			const label =
				[info.label, info.past, info.future, id].find(
					(value): value is string =>
						typeof value === 'string' && value.trim().length > 0,
				) ?? id;
			return { icon, label } satisfies ResolveResult;
		}
		return { icon: '', label: id } satisfies ResolveResult;
	}
	return { icon: '', label: 'Trigger' } satisfies ResolveResult;
}

export function createTriggerDescriptorEntry(
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
	lookup: TriggerLookup,
): DescriptorRegistryEntry {
	return {
		resolve: (id) => resolveTriggerDescriptor(lookup, id),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function formatTriggerLabel(
	lookup: TriggerLookup,
	id: string,
): string | undefined {
	if (!id) {
		return undefined;
	}
	const info = lookup[id];
	if (info) {
		const parts: string[] = [];
		if (info.icon) {
			parts.push(info.icon);
		}
		const label =
			[info.label, info.past, info.future, id].find(
				(value): value is string => {
					return typeof value === 'string' && value.trim().length > 0;
				},
			) ?? id;
		parts.push(label);
		return parts.join(' ').trim();
	}
	return id;
}
