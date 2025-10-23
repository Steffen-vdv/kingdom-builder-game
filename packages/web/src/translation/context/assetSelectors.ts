import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationTriggerAsset,
} from './types';
import type {
	ResourceV2BoundsMetadata,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import type { ResourceV2GlobalActionCostDisplay } from '../resourceV2/selectors';

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

function coerceResourceV2IconLabel(
	source: ReturnType<TranslationAssets['resourceV2']['nodes']['get']>,
	fallbackLabel: string,
): IconLabelDisplay | undefined {
	if (!source?.display) {
		return undefined;
	}
	const { icon, name, description } = source.display;
	const label = name ?? fallbackLabel;
	const result: IconLabelDisplay = { label };
	if (icon !== undefined) {
		result.icon = icon;
	}
	if (description !== undefined) {
		result.description = description;
	}
	return result;
}

export function selectResourceDisplay(
	assets: TranslationAssets | undefined,
	resourceKey: string,
): IconLabelDisplay {
	const resourceV2Entry = assets?.resourceV2.nodes.get(resourceKey);
	const resourceV2Display = coerceResourceV2IconLabel(
		resourceV2Entry,
		resourceKey,
	);
	if (resourceV2Display) {
		return resourceV2Display;
	}
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
	return Object.freeze({ label: triggerId });
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

export function resourceDisplaysAsPercent(
	assets: TranslationAssets | undefined,
	resourceId: string,
): boolean {
	return assets?.resourceV2.displaysAsPercent(resourceId) ?? false;
}

export function selectResourceBounds(
	assets: TranslationAssets | undefined,
	resourceId: string,
): ResourceV2BoundsMetadata | undefined {
	return assets?.resourceV2.selectBounds(resourceId);
}

export function selectResourceTierTrack(
	assets: TranslationAssets | undefined,
	resourceId: string,
): ResourceV2TierTrackDefinition | undefined {
	return assets?.resourceV2.selectTierTrack(resourceId);
}

export function selectGlobalActionCost(
	assets: TranslationAssets | undefined,
): ResourceV2GlobalActionCostDisplay | undefined {
	return assets?.resourceV2.selectGlobalActionCost();
}
