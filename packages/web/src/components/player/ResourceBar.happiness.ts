import type { TranslationContext } from '../../translation/context/types';
import { GENERAL_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import {
	buildTierEntries,
	type TierDefinition,
	type TierEntryDisplayConfig,
	type TierSummary,
} from './buildTierEntries';
import type { SummaryGroup } from '../../translation/content/types';
import type { HoverCard } from '../../state/useHoverCard';
import type { DescriptorDisplay } from './registryDisplays';
import { formatIconLabel } from './registryDisplays';
import type { DescriptorFormatters } from './ResourceBar.display';

interface HappinessHoverOptions {
	value: number;
	tiers: TierDefinition[];
	tieredResourceDescriptor?: DescriptorDisplay | undefined;
	happinessKey?: string;
	passiveAsset: DescriptorDisplay;
	translationContext: TranslationContext;
	happinessFormatters?: DescriptorFormatters | undefined;
}

const FALLBACK_DESCRIPTOR: DescriptorDisplay = {
	id: 'resource',
	label: 'Happiness',
};

function findTierForValue(
	tiers: TierDefinition[],
	value: number,
): TierDefinition | undefined {
	let match: TierDefinition | undefined;
	for (const tier of tiers) {
		const min = tier.range.min ?? Number.NEGATIVE_INFINITY;
		if (value < min) {
			break;
		}
		const max = tier.range.max;
		if (max !== undefined && value > max) {
			continue;
		}
		match = tier;
	}
	return match;
}

const createTierTitle = (
	descriptor: DescriptorDisplay,
	summary: TierSummary,
	orientation: 'higher' | 'current' | 'lower',
): string => {
	const parts = [summary.icon, summary.name]
		.filter((part) => part && String(part).trim().length > 0)
		.join(' ')
		.trim();
	const baseTitle = parts.length ? parts : (summary.entry.title?.trim() ?? '');
	if (orientation === 'current') {
		return baseTitle;
	}
	const thresholdValue =
		orientation === 'higher'
			? summary.rangeMin
			: (summary.rangeMax ?? summary.rangeMin);
	if (thresholdValue === undefined) {
		return baseTitle;
	}
	const suffix = `${thresholdValue}${orientation === 'higher' ? '+' : '-'}`;
	const rangeParts = [descriptor.icon ?? '❔', suffix]
		.filter((part) => part && String(part).trim().length > 0)
		.join(' ')
		.trim();
	if (!rangeParts.length) {
		return baseTitle;
	}
	return `${baseTitle} (${rangeParts})`;
};

export const buildHappinessHoverCard = ({
	value,
	tiers,
	tieredResourceDescriptor,
	happinessKey,
	passiveAsset,
	translationContext,
	happinessFormatters,
}: HappinessHoverOptions): HoverCard => {
	const activeTier = findTierForValue(tiers, value);
	const descriptor = tieredResourceDescriptor ?? {
		...FALLBACK_DESCRIPTOR,
		...(happinessKey ? { id: happinessKey } : {}),
	};
	const tierConfig: TierEntryDisplayConfig = {
		tieredResource: tieredResourceDescriptor,
		passiveAsset,
		translationContext,
	};
	if (activeTier?.id) {
		tierConfig.activeId = activeTier.id;
	}
	const { summaries } = buildTierEntries(tiers, tierConfig);
	const activeIndex = summaries.findIndex((summary) => summary.active);
	const higherSummary =
		activeIndex > 0 ? summaries[activeIndex - 1] : undefined;
	const lowerSummary =
		activeIndex >= 0 && activeIndex + 1 < summaries.length
			? summaries[activeIndex + 1]
			: undefined;
	const tierEntries: SummaryGroup[] = [];
	const pushSummary = (
		summary: TierSummary | undefined,
		orientation: 'higher' | 'current' | 'lower',
	) => {
		if (!summary) {
			return;
		}
		tierEntries.push({
			...summary.entry,
			title: createTierTitle(descriptor, summary, orientation),
		});
	};
	pushSummary(higherSummary, 'higher');
	if (activeIndex >= 0) {
		pushSummary(summaries[activeIndex], 'current');
	} else {
		tierEntries.push({ title: 'No active tier', items: [] });
	}
	pushSummary(lowerSummary, 'lower');
	const formattedValue = happinessFormatters
		? happinessFormatters.formatValue(value)
		: `${value}`;
	return {
		title: formatIconLabel(descriptor),
		effects: tierEntries,
		effectsTitle: `Happiness thresholds (current: ${formattedValue})`,
		requirements: [],
		bgClass: PLAYER_INFO_CARD_BG,
	} satisfies HoverCard;
};

export const buildGeneralResourceHoverCard = (): HoverCard => ({
	title: `${GENERAL_RESOURCE_INFO.icon} ${GENERAL_RESOURCE_INFO.label}`,
	effects: [],
	requirements: [],
	...(GENERAL_RESOURCE_INFO.description
		? { description: GENERAL_RESOURCE_INFO.description }
		: {}),
	bgClass: PLAYER_INFO_CARD_BG,
});
