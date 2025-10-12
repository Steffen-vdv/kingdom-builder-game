import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationTriggerAsset,
} from './types';
import { getFallbackTriggerAsset } from './fallbackAssets';

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
	if (entry) {
		return entry;
	}
	const fallback = getFallbackTriggerAsset(triggerId);
	if (fallback) {
		return fallback;
	}
	return {};
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
