import React from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceCategoryDefinition,
	SessionResourceCategoryItem,
} from '@kingdom-builder/protocol';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import ResourceButton from './ResourceButton';
import {
	createForecastMap,
	createResourceSnapshot,
	formatResourceTitle,
} from './resourceSnapshots';
import { PLAYER_INFO_CARD_BG } from './infoCards';
import ResourceGroupDisplay from './ResourceGroupDisplay';
import { buildTierEntries, type TierDefinition } from './buildTierEntries';
import {
	usePassiveAssetMetadata,
	useResourceMetadata,
} from '../../contexts/RegistryMetadataContext';
import { toDescriptorDisplay } from './registryDisplays';
import {
	buildBoundReferenceMap,
	type BoundRefEntry,
} from './boundReferenceHelpers';
import ResourceWithBoundButton from './ResourceWithBoundButton';
import { getResourceBreakdownSummary } from '../../utils/resourceSources';

interface ResourceCategoryRowProps {
	category: SessionResourceCategoryDefinition;
	player: SessionPlayerStateSnapshot;
}

const ResourceCategoryRow: React.FC<ResourceCategoryRowProps> = ({
	category,
	player,
}) => {
	const { handleHoverCard, clearHoverCard, translationContext, ruleSnapshot } =
		useGameEngine();
	const resourceCatalog = translationContext.resources;
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id];
	const resourceMetadata = useResourceMetadata();

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

	const boundReferenceMap = React.useMemo(
		() =>
			resourceCatalog
				? buildBoundReferenceMap(resourceCatalog.resources.ordered)
				: new Map<string, BoundRefEntry>(),
		[resourceCatalog],
	);

	// Tier display configuration for tiered resources (e.g., happiness)
	const tierDefinitions = ruleSnapshot.tierDefinitions;
	const tieredResourceKey = ruleSnapshot.tieredResourceKey;

	const tieredResourceDescriptor = React.useMemo(
		() =>
			tieredResourceKey
				? toDescriptorDisplay(resourceMetadata.select(tieredResourceKey))
				: undefined,
		[tieredResourceKey, resourceMetadata],
	);

	const passiveAssetMetadata = usePassiveAssetMetadata();
	const passiveAssetDescriptor = React.useMemo(
		() => toDescriptorDisplay(passiveAssetMetadata.select()),
		[passiveAssetMetadata],
	);

	// Map tier passive IDs to tier definitions for authoritative tier detection
	const tierByPassiveId = React.useMemo(
		() =>
			tierDefinitions.reduce<Map<string, TierDefinition>>((map, tier) => {
				const passiveId = tier.preview?.id;
				if (passiveId) {
					map.set(passiveId, tier);
				}
				return map;
			}, new Map()),
		[tierDefinitions],
	);

	// Find the active tier: first check passives (authoritative), then fall back
	// to range check for tiers without passives (like neutral tiers).
	const activeTierId = React.useMemo(() => {
		// Check player's passives first - this is the authoritative tier indicator
		for (const passive of player.passives) {
			const tier = tierByPassiveId.get(passive.id);
			if (tier) {
				return tier.id;
			}
		}
		// Fall back to range-based check for tiers without passives
		if (!tieredResourceKey) {
			return undefined;
		}
		const value = player.values?.[tieredResourceKey] ?? 0;
		for (const tier of tierDefinitions) {
			const min = tier.range.min ?? 0;
			const max = tier.range.max;
			if (value >= min && (max === undefined || value <= max)) {
				return tier.id;
			}
		}
		return undefined;
	}, [
		player.passives,
		tierByPassiveId,
		tieredResourceKey,
		tierDefinitions,
		player.values,
	]);

	const showResourceCard = React.useCallback(
		(resourceId: string) => {
			if (!resourceCatalog) {
				return;
			}
			const definition = resourceCatalog.resources.byId[resourceId];
			if (!definition) {
				return;
			}
			const metadata = translationContext.resourceMetadata.get(resourceId);

			// Check if this is a tiered resource
			let effects: ReturnType<typeof buildTierEntries>['entries'] = [];
			let thermometer:
				| {
						currentValue: number;
						tiers: ReturnType<typeof buildTierEntries>['summaries'];
						resourceIcon?: string;
				  }
				| undefined;

			if (resourceId === tieredResourceKey && tierDefinitions.length > 0) {
				// Find the active tier's index to show context (prev/current/next)
				const sortedTiers = [...tierDefinitions].sort(
					(a, b) => (b.range.min ?? 0) - (a.range.min ?? 0),
				);
				const activeIndex = sortedTiers.findIndex((t) => t.id === activeTierId);

				// Show up to 3 tiers: previous, current, next (or just current if
				// no active tier)
				let tiersToShow: TierDefinition[];
				if (activeIndex >= 0) {
					const start = Math.max(0, activeIndex - 1);
					const end = Math.min(sortedTiers.length, activeIndex + 2);
					tiersToShow = sortedTiers.slice(start, end);
				} else {
					// No active tier, show top 3
					tiersToShow = sortedTiers.slice(0, 3);
				}

				const tierResult = buildTierEntries(tiersToShow, {
					...(activeTierId ? { activeId: activeTierId } : {}),
					tieredResource: tieredResourceDescriptor,
					passiveAsset: passiveAssetDescriptor,
					translationContext,
				});
				effects = tierResult.entries;

				// Build thermometer data for visual tier display
				const currentValue = player.values?.[resourceId] ?? 0;
				const icon = tieredResourceDescriptor?.icon;
				thermometer = {
					currentValue,
					tiers: tierResult.summaries,
					...(icon !== undefined && { resourceIcon: icon }),
				};
			}

			// Build breakdown for resources that track it
			const breakdown = definition.trackValueBreakdown
				? getResourceBreakdownSummary(resourceId, player, translationContext)
				: undefined;

			handleHoverCard({
				title: formatResourceTitle(metadata),
				effects,
				requirements: [],
				...(metadata.description ? { description: metadata.description } : {}),
				...(breakdown && breakdown.length > 0 ? { breakdown } : {}),
				...(thermometer ? { thermometer } : {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[
			handleHoverCard,
			resourceCatalog,
			translationContext,
			tieredResourceKey,
			tierDefinitions,
			activeTierId,
			tieredResourceDescriptor,
			passiveAssetDescriptor,
			player,
		],
	);

	const renderResource = React.useCallback(
		(resourceId: string): React.ReactNode => {
			if (!resourceCatalog) {
				return null;
			}
			const definition = resourceCatalog.resources.byId[resourceId];
			if (!definition) {
				return null;
			}
			// For non-primary categories, only show resources that have been touched
			if (!category.isPrimary && !player.resourceTouched[resourceId]) {
				return null;
			}

			const metadata = translationContext.resourceMetadata.get(resourceId);
			const snapshot = createResourceSnapshot(resourceId, snapshotContext);

			// Check if this resource has a bound reference to another resource
			const boundInfo = boundReferenceMap.get(resourceId);
			if (boundInfo) {
				const boundMetadata = translationContext.resourceMetadata.get(
					boundInfo.boundRef.resourceId,
				);
				const boundSnapshot = createResourceSnapshot(
					boundInfo.boundRef.resourceId,
					snapshotContext,
				);

				return (
					<ResourceWithBoundButton
						key={resourceId}
						metadata={metadata}
						snapshot={snapshot}
						boundMetadata={boundMetadata}
						boundSnapshot={boundSnapshot}
						boundType={boundInfo.boundType}
						onShow={showResourceCard}
						onHide={clearHoverCard}
					/>
				);
			}

			return (
				<ResourceButton
					key={resourceId}
					metadata={metadata}
					snapshot={snapshot}
					onShow={showResourceCard}
					onHide={clearHoverCard}
				/>
			);
		},
		[
			resourceCatalog,
			snapshotContext,
			translationContext.resourceMetadata,
			boundReferenceMap,
			showResourceCard,
			clearHoverCard,
			category.isPrimary,
			player.resourceTouched,
		],
	);

	const renderCategoryItem = React.useCallback(
		(item: SessionResourceCategoryItem): React.ReactNode => {
			if (item.type === 'resource') {
				return renderResource(item.id);
			}
			if (item.type === 'group') {
				return (
					<ResourceGroupDisplay
						key={item.id}
						groupId={item.id}
						player={player}
						isPrimaryCategory={category.isPrimary}
					/>
				);
			}
			return null;
		},
		[renderResource, player, category.isPrimary],
	);

	const categoryIcon = category.icon ?? '';

	const showCategoryCard = React.useCallback(() => {
		if (!category.label) {
			return;
		}
		const title = category.icon
			? `${category.icon} ${category.label}`
			: category.label;
		handleHoverCard({
			title,
			effects: [],
			requirements: [],
			...(category.description ? { description: category.description } : {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});
	}, [handleHoverCard, category]);

	return (
		<div className="info-bar resource-category-row">
			{categoryIcon && (
				<button
					type="button"
					className="info-bar__icon hoverable cursor-help"
					aria-label={category.label}
					onMouseEnter={showCategoryCard}
					onMouseLeave={clearHoverCard}
					onFocus={showCategoryCard}
					onBlur={clearHoverCard}
					onClick={showCategoryCard}
				>
					{categoryIcon}
				</button>
			)}
			{category.contents.map((item) => renderCategoryItem(item))}
		</div>
	);
};

export default ResourceCategoryRow;
