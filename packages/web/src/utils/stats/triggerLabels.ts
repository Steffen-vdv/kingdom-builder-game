import { TRIGGER_INFO } from '@kingdom-builder/contents';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

type TriggerInfoRecord = Record<
	string,
	{ icon?: string; future?: string; past?: string }
>;

const TRIGGER_LOOKUP = TRIGGER_INFO as TriggerInfoRecord;

export function resolveTriggerDescriptor(id?: string): ResolveResult {
	if (id) {
		const info = TRIGGER_LOOKUP[id];
		if (info) {
			return {
				icon: info.icon ?? '',
				label: info.past ?? info.future ?? id,
			} satisfies ResolveResult;
		}
	}
	return { icon: '', label: id ?? 'Trigger' } satisfies ResolveResult;
}

export function createTriggerDescriptorEntry(
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
): DescriptorRegistryEntry {
	return {
		resolve: resolveTriggerDescriptor,
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function formatTriggerLabel(id: string): string | undefined {
	if (!id) {
		return undefined;
	}
	const info = TRIGGER_LOOKUP[id];
	if (info) {
		const parts: string[] = [];
		if (info.icon) {
			parts.push(info.icon);
		}
		const label = info.past ?? info.future ?? id;
		if (label) {
			parts.push(label);
		}
		return parts.join(' ').trim();
	}
	return id;
}
