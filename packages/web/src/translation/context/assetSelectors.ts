import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationTriggerAsset,
} from './types';
import { formatDetailText } from '../../utils/stats/format';

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

function buildTriggerFallback(triggerId: string): TranslationTriggerAsset {
	if (typeof triggerId !== 'string' || triggerId.length === 0) {
		return {};
	}
	const trimmed = triggerId.replace(/^on(?=[A-Z])/u, '');
	const hyphenated = trimmed
		.replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/gu, '$1-$2')
		.replace(/_/gu, '-');
	const tokens = hyphenated
		.split(/[-\s]+/u)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
	if (!tokens.length) {
		return {};
	}
	const label = tokens
		.map((segment) => {
			const upperCase = segment === segment.toUpperCase();
			if (upperCase && segment.length <= 3) {
				return segment;
			}
			const lowered = segment.toLowerCase();
			const formatted = formatDetailText(lowered);
			if (formatted.length > 0) {
				return formatted;
			}
			return formatDetailText(segment);
		})
		.join(' ')
		.trim();
	if (!label.length) {
		return {};
	}
	return Object.freeze({
		label,
		past: label,
		future: label,
	});
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
