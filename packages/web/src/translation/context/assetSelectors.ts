import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationTriggerAsset,
} from './types';
import { resolveTriggerAssetFromContent } from './triggerAssets';

const FALLBACK_TRIGGER_ICON = '🔔';

function toTitleCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]+/u)
		.filter((part) => part.length > 0)
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(' ');
}

function buildTriggerFallback(triggerId: string): TranslationTriggerAsset {
	const cleanId = triggerId.startsWith('on')
		? triggerId.slice('on'.length)
		: triggerId;
	const readable = toTitleCase(cleanId.replace(/Step$/u, ''));
	const past = readable.length ? readable : triggerId;
	const entry: TranslationTriggerAsset = {
		icon: FALLBACK_TRIGGER_ICON,
		past,
		label: past,
	};
	if (readable.length) {
		entry.future = `On ${readable}`;
	}
	return Object.freeze(entry);
}

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
	const entry =
		assets?.triggers?.[triggerId] ?? resolveTriggerAssetFromContent(triggerId);
	if (entry) {
		return entry;
	}
	return buildTriggerFallback(triggerId);
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
