import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationTriggerAsset,
} from './types';
import { DEFAULT_TRIGGER_METADATA } from '../../contexts/defaultRegistryMetadata';

const EMPTY_TRIGGER_ASSET: TranslationTriggerAsset = Object.freeze({});

const FALLBACK_TRIGGER_ASSETS: Readonly<
	Record<string, TranslationTriggerAsset>
> = Object.freeze(
	Object.fromEntries(
		Object.entries(DEFAULT_TRIGGER_METADATA ?? {}).map(
			([identifier, descriptor]) => {
				const entry: TranslationTriggerAsset = {};
				if (descriptor?.icon !== undefined) {
					entry.icon = descriptor.icon;
				}
				if (descriptor?.future !== undefined) {
					entry.future = descriptor.future;
				}
				if (descriptor?.past !== undefined) {
					entry.past = descriptor.past;
				}
				const label = descriptor?.label ?? descriptor?.past;
				if (label !== undefined) {
					entry.label = label;
				}
				return [identifier, Object.freeze(entry)];
			},
		),
	),
);

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
