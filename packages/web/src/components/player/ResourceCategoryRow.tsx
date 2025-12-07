import React from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceCategoryDefinitionV2,
	SessionResourceCategoryItemV2,
	SessionResourceDefinitionV2,
} from '@kingdom-builder/protocol';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import {
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../../translation';
import ResourceButton, { formatResourceMagnitude } from './ResourceButton';
import {
	createForecastMap,
	createResourceSnapshot,
	formatResourceTitle,
} from './resourceV2Snapshots';
import { PLAYER_INFO_CARD_BG } from './infoCards';
import ResourceGroupDisplay from './ResourceGroupDisplay';
import { buildTierEntries, type TierDefinition } from './buildTierEntries';
import {
	usePassiveAssetMetadata,
	useResourceMetadata,
} from '../../contexts/RegistryMetadataContext';
import { toDescriptorDisplay } from './registryDisplays';

interface ResourceCategoryRowProps {
	category: SessionResourceCategoryDefinitionV2;
	player: SessionPlayerStateSnapshot;
}

function buildBoundResourceMap(
	definitions: readonly SessionResourceDefinitionV2[],
): Map<string, SessionResourceDefinitionV2> {
	const map = new Map<string, SessionResourceDefinitionV2>();
	for (const definition of definitions) {
		if (definition.boundOf) {
			map.set(definition.boundOf.resourceId, definition);
		}
	}
	return map;
}

const ResourceCategoryRow: React.FC<ResourceCategoryRowProps> = ({
	category,
	player,
}) => {
	const { handleHoverCard, clearHoverCard, translationContext, ruleSnapshot } =
		useGameEngine();
	const resourceCatalog = translationContext.resourcesV2;
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

	const boundResourceMap = React.useMemo(
		() =>
			resourceCatalog
				? buildBoundResourceMap(resourceCatalog.resources.ordered)
				: new Map<string, SessionResourceDefinitionV2>(),
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

	// Find the active tier by checking the tiered resource's value against tier
	// ranges. This handles tiers without passives (like neutral tiers).
	const activeTierId = React.useMemo(() => {
		if (!tieredResourceKey) {
			return undefined;
		}
		const value = player.valuesV2?.[tieredResourceKey] ?? 0;
		for (const tier of tierDefinitions) {
			const min = tier.range.min ?? 0;
			const max = tier.range.max;
			if (value >= min && (max === undefined || value <= max)) {
				return tier.id;
			}
		}
		return undefined;
	}, [tieredResourceKey, tierDefinitions, player.valuesV2]);

	const showResourceCard = React.useCallback(
		(resourceId: string) => {
			if (!resourceCatalog) {
				return;
			}
			const definition = resourceCatalog.resources.byId[resourceId];
			if (!definition) {
				return;
			}
			const metadata = translationContext.resourceMetadataV2.get(resourceId);

			// Check if this is a tiered resource
			let effects: ReturnType<typeof buildTierEntries>['entries'] = [];
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
			}

			handleHoverCard({
				title: formatResourceTitle(metadata),
				effects,
				requirements: [],
				...(metadata.description ? { description: metadata.description } : {}),
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
			// Skip resources that have boundOf - they display with their target
			if (definition.boundOf) {
				return null;
			}
			// For non-primary categories, only show resources that have been touched
			if (!category.isPrimary && !player.resourceTouchedV2[resourceId]) {
				return null;
			}

			const metadata = translationContext.resourceMetadataV2.get(resourceId);
			const snapshot = createResourceSnapshot(resourceId, snapshotContext);

			// Check if there's a bound resource for this resource
			const boundDef = boundResourceMap.get(resourceId);
			if (boundDef) {
				const boundMetadata = translationContext.resourceMetadataV2.get(
					boundDef.id,
				);
				const boundSnapshot = createResourceSnapshot(
					boundDef.id,
					snapshotContext,
				);

				return (
					<ResourceWithBoundButton
						key={resourceId}
						metadata={metadata}
						snapshot={snapshot}
						boundMetadata={boundMetadata}
						boundSnapshot={boundSnapshot}
						boundType={boundDef.boundOf?.boundType ?? 'upper'}
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
			translationContext.resourceMetadataV2,
			boundResourceMap,
			showResourceCard,
			clearHoverCard,
			category.isPrimary,
			player.resourceTouchedV2,
		],
	);

	const renderCategoryItem = React.useCallback(
		(item: SessionResourceCategoryItemV2): React.ReactNode => {
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

interface ResourceWithBoundButtonProps {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
	boundMetadata: ResourceV2MetadataSnapshot;
	boundSnapshot: ResourceV2ValueSnapshot;
	boundType: 'upper' | 'lower';
	onShow: (resourceId: string) => void;
	onHide: () => void;
}

const ResourceWithBoundButton: React.FC<ResourceWithBoundButtonProps> = ({
	metadata,
	snapshot,
	boundMetadata,
	boundSnapshot,
	boundType,
	onShow,
	onHide,
}) => {
	const handleShow = React.useCallback(() => {
		onShow(snapshot.id);
	}, [onShow, snapshot.id]);

	const iconLabel = metadata.icon ?? '?';
	const currentValue = formatResourceMagnitude(snapshot.current, metadata);
	const boundValue = formatResourceMagnitude(
		boundSnapshot.current,
		boundMetadata,
	);

	const displayValue =
		boundType === 'upper'
			? `${currentValue}/${boundValue}`
			: `${boundValue}/${currentValue}`;

	const ariaLabel = `${metadata.label}: ${displayValue}`;

	return (
		<button
			type="button"
			className="bar-item hoverable cursor-help relative overflow-visible"
			onMouseEnter={handleShow}
			onMouseLeave={onHide}
			onFocus={handleShow}
			onBlur={onHide}
			onClick={handleShow}
			aria-label={ariaLabel}
		>
			<span aria-hidden="true">{iconLabel}</span>
			{displayValue}
		</button>
	);
};

export default ResourceCategoryRow;
