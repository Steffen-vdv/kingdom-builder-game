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
import ResourceButton, { formatResourceMagnitude } from './ResourceButton';
import { usePassiveAssetMetadata } from '../../contexts/RegistryMetadataContext';
import {
	buildResourceV2HoverSections,
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../../translation';
import {
	createForecastMap,
	createResourceSnapshot,
	formatResourceTitle,
	toDescriptorFromMetadata,
} from './resourceV2Snapshots';
import { toDescriptorDisplay } from './registryDisplays';

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

interface ResourceEntry {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
	const { translationContext, handleHoverCard, clearHoverCard, ruleSnapshot } =
		useGameEngine();
	const passiveAssetMetadata = usePassiveAssetMetadata();
	const passiveAsset = React.useMemo(
		() => toDescriptorDisplay(passiveAssetMetadata.select()),
		[passiveAssetMetadata],
	);
	const resourceCatalog = translationContext.resourcesV2;
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id];
	const forecastMap = React.useMemo(
		() => createForecastMap(playerForecast),
		[playerForecast],
	);
	const snapshotContext = React.useMemo(
		() => ({
			player,
			forecastMap,
			signedGains: translationContext.signedResourceGains,
		}),
		[player, forecastMap, translationContext.signedResourceGains],
	);
	const resourceEntries = React.useMemo<ResourceEntry[]>(() => {
		if (!resourceCatalog) {
			return [];
		}
		return resourceCatalog.resources.ordered
			.filter((definition) => {
				const { groupId } = definition;
				if (groupId === 'resource-group:stats') {
					return false;
				}
				if (groupId === 'resource-group:population:roles') {
					return false;
				}
				return true;
			})
			.map((definition) => {
				const metadata = translationContext.resourceMetadataV2.get(
					definition.id,
				);
				const snapshot = createResourceSnapshot(definition.id, snapshotContext);
				return { metadata, snapshot } satisfies ResourceEntry;
			});
	}, [resourceCatalog, snapshotContext, translationContext.resourceMetadataV2]);
	const resourceMap = React.useMemo(
		() =>
			new Map(
				resourceEntries.map((entry) => [entry.snapshot.id, entry] as const),
			),
		[resourceEntries],
	);
	const tiers = ruleSnapshot.tierDefinitions;
	// tieredResourceKey is already a V2 resource ID
	const tieredResourceId = ruleSnapshot.tieredResourceKey;

	const showHappinessCard = React.useCallback(
		(entry: ResourceEntry) => {
			const descriptor = toDescriptorFromMetadata(entry.metadata);
			const activeTier = findTierForValue(tiers, entry.snapshot.current);
			const tierConfig: TierEntryDisplayConfig = {
				tieredResource: descriptor,
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
				const formatted = formatResourceMagnitude(
					thresholdValue,
					entry.metadata,
				);
				const suffix =
					orientation === 'higher' ? `${formatted}+` : `${formatted}-`;
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
			const baseSections = buildResourceV2HoverSections(
				entry.metadata,
				entry.snapshot,
			);
			const effects = [...baseSections, ...tierEntries];
			handleHoverCard({
				title: formatResourceTitle(entry.metadata),
				effects,
				effectsTitle: `Happiness thresholds (current: ${formatResourceMagnitude(
					entry.snapshot.current,
					entry.metadata,
				)})`,
				requirements: [],
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard, passiveAsset, tiers, translationContext],
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
		(resourceId: string) => {
			const entry = resourceMap.get(resourceId);
			if (!entry) {
				return;
			}
			if (tieredResourceId && resourceId === tieredResourceId) {
				showHappinessCard(entry);
				return;
			}
			const effects = buildResourceV2HoverSections(
				entry.metadata,
				entry.snapshot,
			);
			handleHoverCard({
				title: formatResourceTitle(entry.metadata),
				effects,
				requirements: [],
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard, tieredResourceId, resourceMap, showHappinessCard],
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
			{resourceEntries.map((entry) => (
				<ResourceButton
					key={entry.snapshot.id}
					metadata={entry.metadata}
					snapshot={entry.snapshot}
					onShow={handleShowResource}
					onHide={clearHoverCard}
				/>
			))}
		</div>
	);
};

export default ResourceBar;
