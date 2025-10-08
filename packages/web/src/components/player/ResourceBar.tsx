import React from 'react';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { GENERAL_RESOURCE_ICON } from '../../icons';
import { GENERAL_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import { buildTierEntries, type TierDefinition } from './buildTierEntries';
import type { SummaryGroup } from '../../translation/content/types';
import ResourceButton, { type ResourceButtonProps } from './ResourceButton';

interface ResourceBarPlayer {
	id: string;
	resources: Record<string, number | undefined>;
}

interface ResourceBarProps {
	player: ResourceBarPlayer;
}

function findTierForValue(
	tiers: ReadonlyArray<TierDefinition>,
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

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
	const { translationContext, handleHoverCard, clearHoverCard, ruleSnapshot } =
		useGameEngine();
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id] ?? {
		resources: {},
		stats: {},
		population: {},
	};
	const resourceKeys = Object.keys(RESOURCES) as ResourceKey[];
	const tiers =
		translationContext.rules?.tierDefinitions ?? ruleSnapshot.tierDefinitions;
	const happinessKey = (translationContext.rules?.tieredResourceKey ??
		ruleSnapshot.tieredResourceKey) as ResourceKey;
	const showHappinessCard = (value: number) => {
		const activeTier = findTierForValue(tiers, value);
		const { summaries } = buildTierEntries(
			tiers,
			activeTier?.id,
			translationContext,
			happinessKey,
		);
		const info = RESOURCES[happinessKey];
		const activeIndex = summaries.findIndex((summary) => summary.active);
		const higherSummary =
			activeIndex > 0 ? summaries[activeIndex - 1] : undefined;
		const lowerSummary =
			activeIndex >= 0 && activeIndex + 1 < summaries.length
				? summaries[activeIndex + 1]
				: undefined;
		const formatTierTitle = (
			summary: (typeof summaries)[number],
			orientation: 'higher' | 'current' | 'lower',
		) => {
			const parts = [summary.icon, summary.name]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			const baseTitle = parts.length
				? parts
				: (summary.entry.title?.trim() ?? '');
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
			const rangeParts = [info.icon, suffix]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			if (!rangeParts.length) {
				return baseTitle;
			}
			return `${baseTitle} (${rangeParts})`;
		};
		const tierEntries: SummaryGroup[] = [];
		if (higherSummary) {
			tierEntries.push({
				...higherSummary.entry,
				title: formatTierTitle(higherSummary, 'higher'),
			});
		}
		if (activeIndex >= 0) {
			const currentSummary = summaries[activeIndex];
			if (currentSummary) {
				tierEntries.push({
					...currentSummary.entry,
					title: formatTierTitle(currentSummary, 'current'),
				});
			} else {
				tierEntries.push({ title: 'No active tier', items: [] });
			}
		} else {
			tierEntries.push({ title: 'No active tier', items: [] });
		}
		if (lowerSummary) {
			tierEntries.push({
				...lowerSummary.entry,
				title: formatTierTitle(lowerSummary, 'lower'),
			});
		}
		handleHoverCard({
			title: `${info.icon} ${info.label}`,
			effects: tierEntries,
			effectsTitle: `Happiness thresholds (current: ${value})`,
			requirements: [],
			bgClass: PLAYER_INFO_CARD_BG,
		});
	};
	const showGeneralResourceCard = () =>
		handleHoverCard({
			title: `${GENERAL_RESOURCE_INFO.icon} ${GENERAL_RESOURCE_INFO.label}`,
			effects: [],
			requirements: [],
			description: GENERAL_RESOURCE_INFO.description,
			bgClass: PLAYER_INFO_CARD_BG,
		});

	return (
		<div className="info-bar resource-bar">
			<button
				type="button"
				className="info-bar__icon hoverable cursor-help"
				aria-label={`${GENERAL_RESOURCE_INFO.label} overview`}
				onMouseEnter={showGeneralResourceCard}
				onMouseLeave={clearHoverCard}
				onFocus={showGeneralResourceCard}
				onBlur={clearHoverCard}
				onClick={showGeneralResourceCard}
			>
				{GENERAL_RESOURCE_ICON}
			</button>
			{resourceKeys.map((resourceKey) => {
				const resourceInfo = RESOURCES[resourceKey];
				const resourceValue = player.resources[resourceKey] ?? 0;
				const showResourceCard = () => {
					if (resourceKey === happinessKey) {
						showHappinessCard(resourceValue);
						return;
					}
					handleHoverCard({
						title: `${resourceInfo.icon} ${resourceInfo.label}`,
						effects: [],
						requirements: [],
						description: resourceInfo.description,
						bgClass: PLAYER_INFO_CARD_BG,
					});
				};
				const nextTurnDelta = playerForecast.resources[resourceKey];
				const buttonProps: ResourceButtonProps = {
					resourceKey,
					value: resourceValue,
					onShow: showResourceCard,
					onHide: clearHoverCard,
				};
				if (typeof nextTurnDelta === 'number') {
					buttonProps.forecastDelta = nextTurnDelta;
				}
				return <ResourceButton key={resourceKey} {...buttonProps} />;
			})}
		</div>
	);
};

export default ResourceBar;
