import type { TranslationAssets } from '../../translation/context';
import { selectTriggerDisplay } from '../../translation/context';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

const DEFAULT_TRIGGER_LABEL = 'Trigger';

/**
 * Selects icon and label for a trigger identifier using translation assets with sensible fallbacks.
 *
 * @param assets - Translation assets used to resolve localized trigger display strings
 * @param id - Trigger identifier to resolve; when omitted the default trigger label is used
 * @returns An object with `icon` (empty string when unavailable) and `label` (derived from asset `past`, `future`, or `label`, falling back to the `id` or the default label)
 */
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

/**
 * Resolve a trigger descriptor (icon and label) for a given trigger identifier using translation assets.
 *
 * @param assets - Translation assets used to derive localized icon and label; may be `undefined`
 * @param id - Trigger identifier to resolve; may be `undefined`
 * @returns An object with `icon` (empty string when not available) and `label` (falls back to the `id` or the default "Trigger")
 */
export function resolveTriggerDescriptor(
	assets: TranslationAssets | undefined,
	id?: string,
): ResolveResult {
	return coerceTriggerLabel(assets, id);
}

/**
 * Create a DescriptorRegistryEntry for trigger descriptors that resolves labels using the provided translation assets.
 *
 * @param assets - Translation assets used to derive trigger icon and label during resolution
 * @param defaultFormatDetail - Default `formatDetail` to include on the returned entry
 * @returns A DescriptorRegistryEntry whose `resolve` function resolves trigger descriptors using `assets` and whose `formatDetail` is `defaultFormatDetail`
 */
export function createTriggerDescriptorEntry(
	assets: TranslationAssets,
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
): DescriptorRegistryEntry {
	return {
		resolve: (id) => resolveTriggerDescriptor(assets, id),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

/**
 * Builds a display label for a trigger by combining its resolved icon and label.
 *
 * @param assets - Translation assets used to resolve the trigger's icon and label
 * @param id - The trigger identifier to resolve
 * @returns The combined string containing icon and label separated by a space, or `undefined` if `id` is falsy or no display parts are available
 */
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