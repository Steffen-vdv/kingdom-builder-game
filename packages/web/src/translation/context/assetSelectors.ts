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

/**
 * Retrieve the translation asset for a trigger and fall back to a minimal label object when missing.
 *
 * @param assets - Translation assets to look up the trigger in; may be `undefined`
 * @param triggerId - Identifier of the trigger used to find the asset and as the fallback label
 * @returns The matching `TranslationTriggerAsset` from `assets` if present; otherwise a frozen object with `label` set to `triggerId`
 */
export function selectTriggerDisplay(
	assets: TranslationAssets | undefined,
	triggerId: string,
): TranslationTriggerAsset {
	const entry = assets?.triggers?.[triggerId];
	if (entry) {
		return entry;
	}
	return Object.freeze({ label: triggerId });
}

/**
 * Retrieve the localized tier summary text for a given tier token.
 *
 * @param token - The tier token identifier to look up.
 * @returns The tier summary for `token` if present, `undefined` otherwise.
 */
export function selectTierSummary(
	assets: TranslationAssets | undefined,
	token: string | undefined,
): string | undefined {
	if (!token) {
		return undefined;
	}
	return assets?.tierSummaries?.[token];
}