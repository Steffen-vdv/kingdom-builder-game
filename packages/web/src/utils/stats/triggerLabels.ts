import type { SessionTriggerMetadata } from '@kingdom-builder/protocol/session';
import type { TranslationTriggerAsset } from '../../translation/context';
import { DEFAULT_TRIGGER_METADATA } from '../../contexts/defaultRegistryMetadata';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

type TriggerMetadataRecord =
	| Readonly<Record<string, SessionTriggerMetadata>>
	| Readonly<Record<string, TranslationTriggerAsset>>;

type TriggerDescriptor = Partial<SessionTriggerMetadata>;

const FALLBACK_TRIGGER_METADATA = DEFAULT_TRIGGER_METADATA as Readonly<
	Record<string, SessionTriggerMetadata>
>;

function selectString(
	...candidates: (string | undefined)[]
): string | undefined {
	for (const candidate of candidates) {
		if (typeof candidate !== 'string') {
			continue;
		}
		const trimmed = candidate.trim();
		if (trimmed.length > 0) {
			return trimmed;
		}
	}
	return undefined;
}

function selectDescriptor(
	metadata: TriggerMetadataRecord | undefined,
	id?: string,
): TriggerDescriptor | undefined {
	if (!id) {
		return undefined;
	}
	return metadata?.[id];
}

function coerceTriggerDescriptor(
	metadata: TriggerMetadataRecord | undefined,
	id?: string,
): ResolveResult {
	const descriptor = selectDescriptor(metadata, id);
	const fallback = selectDescriptor(FALLBACK_TRIGGER_METADATA, id);
	const icon = selectString(descriptor?.icon, fallback?.icon) ?? '';
	const label =
		selectString(
			descriptor?.label,
			descriptor?.past,
			descriptor?.future,
			fallback?.label,
			fallback?.past,
			fallback?.future,
		) ??
		id ??
		'Trigger';
	return { icon, label } satisfies ResolveResult;
}

export function resolveTriggerDescriptor(
	metadata: TriggerMetadataRecord | undefined,
	id?: string,
): ResolveResult {
	return coerceTriggerDescriptor(metadata, id);
}

export function createTriggerDescriptorEntry(
	metadata: TriggerMetadataRecord | undefined,
	defaultFormatDetail: NonNullable<DescriptorRegistryEntry['formatDetail']>,
): DescriptorRegistryEntry {
	return {
		resolve: (id) => resolveTriggerDescriptor(metadata, id),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function formatTriggerLabel(
	metadata: TriggerMetadataRecord | undefined,
	id: string,
): string | undefined {
	if (!id) {
		return undefined;
	}
	const descriptor = coerceTriggerDescriptor(metadata, id);
	const iconText = descriptor.icon ? descriptor.icon.trim() : '';
	const labelText = descriptor.label ? descriptor.label.trim() : '';
	const parts: string[] = [];
	if (iconText) {
		parts.push(iconText);
	}
	if (labelText) {
		parts.push(labelText);
	}
	const formatted = parts.join(' ').trim();
	if (formatted.length > 0) {
		return formatted;
	}
	return id.trim() || undefined;
}
