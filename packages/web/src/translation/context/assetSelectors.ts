import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationTriggerAsset,
} from './types';
import type { SessionTriggerMetadata } from '@kingdom-builder/protocol/session';
import { DEFAULT_TRIGGER_METADATA } from '../../contexts/defaultRegistryMetadata';

interface IconLabelDisplay {
	icon?: string;
	label: string;
	description?: string;
}

const EMPTY_TRIGGER_ASSET = Object.freeze({}) as TranslationTriggerAsset;

function createTriggerAssetFromMetadata(
	descriptor: SessionTriggerMetadata | undefined,
): TranslationTriggerAsset {
	if (!descriptor) {
		return EMPTY_TRIGGER_ASSET;
	}
	const entry: TranslationTriggerAsset = {};
	let hasMetadata = false;
	if (descriptor.icon !== undefined) {
		entry.icon = descriptor.icon;
		hasMetadata = true;
	}
	if (descriptor.future !== undefined) {
		entry.future = descriptor.future;
		hasMetadata = true;
	}
	if (descriptor.past !== undefined) {
		entry.past = descriptor.past;
		hasMetadata = true;
	}
	const label = descriptor.label ?? descriptor.past;
	if (label !== undefined) {
		entry.label = label;
		hasMetadata = true;
	}
	if (!hasMetadata) {
		return EMPTY_TRIGGER_ASSET;
	}
	return Object.freeze(entry);
}

const FALLBACK_TRIGGER_ASSETS: Readonly<
	Record<string, TranslationTriggerAsset>
> = Object.freeze(
	Object.fromEntries(
		Object.entries(DEFAULT_TRIGGER_METADATA ?? {}).map(([key, descriptor]) => [
			key,
			createTriggerAssetFromMetadata(descriptor),
		]),
	),
);

function coerceIconLabel(
	source: TranslationIconLabel | undefined,
	fallbackLabel: string,
): IconLabelDisplay {
	const label = source?.label ?? fallbackLabel;
	const result: IconLabelDisplay = {
		label,
	};
	if (source?.icon !== undefined) {
		result.icon = source.icon;
	}
	if (source?.description !== undefined) {
		result.description = source.description;
	}
	return result;
}

export function selectResourceDisplay(
	assets: TranslationAssets | undefined,
	resourceKey: string,
): IconLabelDisplay {
	const info = assets?.resources?.[resourceKey];
	return coerceIconLabel(info, resourceKey);
}

export function selectStatDisplay(
	assets: TranslationAssets | undefined,
	statKey: string,
): IconLabelDisplay {
	const info = assets?.stats?.[statKey];
	return coerceIconLabel(info, statKey);
}

export function selectPopulationRoleDisplay(
	assets: TranslationAssets | undefined,
	roleId: string | undefined,
): IconLabelDisplay {
	if (roleId) {
		const entry = assets?.populations?.[roleId];
		if (entry) {
			return coerceIconLabel(entry, roleId);
		}
	}
	return coerceIconLabel(assets?.population, roleId ?? 'Population');
}

export function selectSlotDisplay(
	assets: TranslationAssets | undefined,
): IconLabelDisplay {
	return coerceIconLabel(assets?.slot, 'Development Slot');
}

export function selectUpkeepDisplay(
	assets: TranslationAssets | undefined,
): IconLabelDisplay {
	return coerceIconLabel(assets?.upkeep, 'Upkeep');
}

export function selectTriggerDisplay(
	assets: TranslationAssets | undefined,
	triggerId: string,
): TranslationTriggerAsset {
	const entry = assets?.triggers?.[triggerId];
	if (entry !== undefined) {
		return entry;
	}
	const fallback = FALLBACK_TRIGGER_ASSETS[triggerId];
	if (fallback !== undefined) {
		return fallback;
	}
	return EMPTY_TRIGGER_ASSET;
}

export function selectTierSummary(
	assets: TranslationAssets | undefined,
	token: string | undefined,
): string | undefined {
	if (!token) {
		return undefined;
	}
	return assets?.tierSummaries?.[token];
}
