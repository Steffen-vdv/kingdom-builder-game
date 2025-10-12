import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { GENERAL_RESOURCE_ICON } from '../../icons';
import { GENERAL_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import {
	buildTierEntries,
	type TierDefinition,
	type TierEntryDisplayConfig,
} from './buildTierEntries';
import type { SummaryGroup } from '../../translation/content/types';
import ResourceButton, { type ResourceButtonProps } from './ResourceButton';
import {
	usePassiveAssetMetadata,
	useResourceMetadata,
} from '../../contexts/RegistryMetadataContext';
import {
	formatDescriptorSummary,
	toDescriptorDisplay,
	type DescriptorDisplay,
} from './registryDisplays';

interface ResourceBarProps {
	player: SessionPlayerStateSnapshot;
}

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

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
	const { translationContext, handleHoverCard, clearHoverCard, ruleSnapshot } =
		useGameEngine();
	const resourceMetadata = useResourceMetadata();
	const passiveAssetMetadata = usePassiveAssetMetadata();
	const passiveAsset = React.useMemo(
		() => toDescriptorDisplay(passiveAssetMetadata.select()),
		[passiveAssetMetadata],
	);
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id] ?? {
		resources: {},
		stats: {},
		population: {},
	};
	const resourceDescriptors = React.useMemo(
		() => resourceMetadata.list.map(toDescriptorDisplay),
		[resourceMetadata],
	);
	const resourceDescriptorMap = React.useMemo(() => {
		const pairs = resourceDescriptors.map(
			(descriptor) => [descriptor.id, descriptor] as const,
		);
		return new Map(pairs);
	}, [resourceDescriptors]);
	const tiers = ruleSnapshot.tierDefinitions;
	const happinessKey = ruleSnapshot.tieredResourceKey;
	const tieredResourceDescriptor: DescriptorDisplay | undefined =
		React.useMemo(() => {
			if (!happinessKey) {
				return undefined;
			}
			const cached = resourceDescriptorMap.get(happinessKey);
			if (cached) {
				return cached;
			}
			return toDescriptorDisplay(resourceMetadata.select(happinessKey));
		}, [happinessKey, resourceDescriptorMap, resourceMetadata]);
	const showHappinessCard = React.useCallback(
		(value: number) => {
			const activeTier = findTierForValue(tiers, value);
			const tierConfig: TierEntryDisplayConfig = {
				tieredResource: tieredResourceDescriptor,
				passiveAsset,
				translationContext,
			};
			if (activeTier?.id) {
				tierConfig.activeId = activeTier.id;
			}
			const { summaries } = buildTierEntries(tiers, tierConfig);
			const descriptor = tieredResourceDescriptor ?? {
				id: happinessKey ?? 'resource',
				label: 'Happiness',
			};
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
				const rangeParts = [descriptor.icon ?? '❔', suffix]
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
				title: formatDescriptorSummary(descriptor),
				effects: tierEntries,
				effectsTitle: `Happiness thresholds (current: ${value})`,
				requirements: [],
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[
			handleHoverCard,
			happinessKey,
			passiveAsset,
			tieredResourceDescriptor,
			tiers,
			translationContext,
		],
	);
	const showGeneralResourceCard = () =>
		handleHoverCard({
			title: `${GENERAL_RESOURCE_INFO.icon} ${GENERAL_RESOURCE_INFO.label}`,
			effects: [],
			requirements: [],
			...(GENERAL_RESOURCE_INFO.description
				? { description: GENERAL_RESOURCE_INFO.description }
				: {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});
	const handleShowResource = React.useCallback(
		(resourceKey: string) => {
			const descriptor = resourceDescriptorMap.get(resourceKey);
			if (!descriptor) {
				return;
			}
			if (happinessKey && resourceKey === happinessKey) {
				const resourceValue = player.resources[resourceKey] ?? 0;
				showHappinessCard(resourceValue);
				return;
			}
			handleHoverCard({
				title: formatDescriptorSummary(descriptor),
				effects: [],
				requirements: [],
				...(descriptor.description
					? { description: descriptor.description }
					: {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[
			happinessKey,
			handleHoverCard,
			player.resources,
			resourceDescriptorMap,
			showHappinessCard,
		],
	);

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
			{resourceDescriptors.map((descriptor) => {
				const resourceKey = descriptor.id;
				const resourceValue = player.resources[resourceKey] ?? 0;
				const nextTurnDelta = playerForecast.resources[resourceKey];
				const buttonProps: ResourceButtonProps = {
					resourceId: resourceKey,
					label: descriptor.label,
					value: resourceValue,
					onShow: handleShowResource,
					onHide: clearHoverCard,
					...(descriptor.icon !== undefined ? { icon: descriptor.icon } : {}),
					...(typeof nextTurnDelta === 'number'
						? { forecastDelta: nextTurnDelta }
						: {}),
				};
				return <ResourceButton key={resourceKey} {...buttonProps} />;
			})}
		</div>
	);
};

export default ResourceBar;
