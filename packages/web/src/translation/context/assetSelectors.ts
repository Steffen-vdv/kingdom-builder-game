import type { SessionTriggerMetadata } from '@kingdom-builder/protocol/session';
import { DEFAULT_TRIGGER_METADATA } from '../../contexts/defaultRegistryMetadata';
import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationTriggerAsset,
} from './types';

interface IconLabelDisplay {
	icon?: string;
	label: string;
	description?: string;
}

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

const EMPTY_TRIGGER_ASSET = Object.freeze({}) as TranslationTriggerAsset;

const FALLBACK_TRIGGER_ASSETS = Object.freeze(
	Object.fromEntries(
		Object.entries(DEFAULT_TRIGGER_METADATA ?? {}).map(([id, descriptor]) => [
			id,
			createTriggerAsset(descriptor),
		]),
	),
) as Readonly<Record<string, TranslationTriggerAsset>>;

const UNKNOWN_TRIGGER_CACHE = new Map<string, TranslationTriggerAsset>();

function createTriggerAsset(
	descriptor: SessionTriggerMetadata | undefined,
): TranslationTriggerAsset {
	if (!descriptor) {
		return EMPTY_TRIGGER_ASSET;
	}
	const entry: TranslationTriggerAsset = {};
	if (descriptor.icon !== undefined) {
		entry.icon = descriptor.icon;
	}
	if (descriptor.future !== undefined) {
		entry.future = descriptor.future;
	}
	if (descriptor.past !== undefined) {
		entry.past = descriptor.past;
	}
	const label = descriptor.label ?? descriptor.past ?? descriptor.future;
	if (label !== undefined) {
		entry.label = label;
	}
	return Object.freeze(entry);
}

function selectFallbackTrigger(triggerId: string): TranslationTriggerAsset {
	const fallback = FALLBACK_TRIGGER_ASSETS[triggerId];
	if (fallback) {
		return fallback;
	}
	const cached = UNKNOWN_TRIGGER_CACHE.get(triggerId);
	if (cached) {
		return cached;
	}
	const trimmed = triggerId.trim();
	const label = trimmed.length > 0 ? triggerId : 'Trigger';
	const asset = Object.freeze({ label }) as TranslationTriggerAsset;
	UNKNOWN_TRIGGER_CACHE.set(triggerId, asset);
	return asset;
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
	const triggers = assets?.triggers;
	if (triggers) {
		const entry = triggers[triggerId];
		if (entry) {
			return entry;
		}
	}
	return selectFallbackTrigger(triggerId);
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
