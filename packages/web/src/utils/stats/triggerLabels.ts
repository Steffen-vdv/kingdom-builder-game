import type {
	TranslationAssets,
	TranslationContext,
} from '../../translation/context';
import { selectTriggerDisplay } from '../../translation/context';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

function resolveTriggerDescriptorFromAssets(
	assets: TranslationAssets | undefined,
	id?: string,
): ResolveResult {
	if (id) {
		const info = selectTriggerDisplay(assets, id);
		return {
			icon: info.icon ?? '',
			label: info.past ?? info.label ?? id,
		} satisfies ResolveResult;
	}
	return { icon: '', label: 'Trigger' } satisfies ResolveResult;
}

export function resolveTriggerDescriptor(
	assets: TranslationAssets | undefined,
	id?: string,
): ResolveResult {
	return resolveTriggerDescriptorFromAssets(assets, id);
}

export function createTriggerDescriptorEntry(
	translationContext: TranslationContext,
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
): DescriptorRegistryEntry {
	return {
		resolve: (id) =>
			resolveTriggerDescriptorFromAssets(translationContext.assets, id),
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
	const resolved = resolveTriggerDescriptorFromAssets(assets, id);
	const parts: string[] = [];
	if (resolved.icon) {
		parts.push(resolved.icon);
	}
	if (resolved.label) {
		parts.push(resolved.label);
	}
	const label = parts.join(' ').trim();
	return label || id;
}
