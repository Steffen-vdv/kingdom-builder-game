import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { GENERAL_RESOURCE_ICON } from '../../icons';
import { GENERAL_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import ResourceButton, { type ResourceButtonProps } from './ResourceButton';
import type { SummaryGroup } from '../../translation/content/types';
import {
	usePassiveAssetMetadata,
	useResourceMetadata,
	useResourceGroupMetadata,
	useResourceGroupParentMetadata,
	useResourceParentMap,
} from '../../contexts/RegistryMetadataContext';
import {
	buildDescriptorFormatters,
	buildResourceDisplayEntries,
	type ResourceGroupEntryDisplay,
} from './ResourceBar.display';
import {
	buildGeneralResourceHoverCard,
	buildHappinessHoverCard,
} from './ResourceBar.happiness';
import {
	formatIconLabel,
	toDescriptorDisplay,
	type DescriptorDisplay,
} from './registryDisplays';

interface ResourceBarProps {
	player: SessionPlayerStateSnapshot;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
	const { translationContext, handleHoverCard, clearHoverCard, ruleSnapshot } =
		useGameEngine();
	const resourceMetadata = useResourceMetadata();
	const resourceGroupMetadata = useResourceGroupMetadata();
	const resourceGroupParentMetadata = useResourceGroupParentMetadata();
	const resourceParentMap = useResourceParentMap();
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
	const resourceGroupDescriptors = React.useMemo(
		() => resourceGroupMetadata.list.map(toDescriptorDisplay),
		[resourceGroupMetadata],
	);
	const resourceGroupParentDescriptors = React.useMemo(
		() => resourceGroupParentMetadata.list.map(toDescriptorDisplay),
		[resourceGroupParentMetadata],
	);
	const descriptorFormatters = React.useMemo(
		() =>
			buildDescriptorFormatters(
				resourceDescriptors,
				resourceGroupParentDescriptors,
			),
		[resourceDescriptors, resourceGroupParentDescriptors],
	);
	const { entries: displayEntries, parentInfo } = React.useMemo(
		() =>
			buildResourceDisplayEntries({
				resourceDescriptors,
				resourceGroupDescriptors,
				resourceGroupParentDescriptors,
				resourceParentMap,
			}),
		[
			resourceDescriptors,
			resourceGroupDescriptors,
			resourceGroupParentDescriptors,
			resourceParentMap,
		],
	);
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
	const happinessFormatters = happinessKey
		? descriptorFormatters.get(happinessKey)
		: undefined;
	const showHappinessCard = React.useCallback(
		(value: number) => {
			const card = buildHappinessHoverCard({
				value,
				tiers,
				tieredResourceDescriptor,
				happinessKey,
				passiveAsset,
				translationContext,
				happinessFormatters,
			});
			handleHoverCard(card);
		},
		[
			buildHappinessHoverCard,
			handleHoverCard,
			happinessFormatters,
			happinessKey,
			passiveAsset,
			tieredResourceDescriptor,
			tiers,
			translationContext,
		],
	);
	const showGeneralResourceCard = React.useCallback(() => {
		handleHoverCard(buildGeneralResourceHoverCard());
	}, [handleHoverCard]);
	const resolveResourceValue = React.useCallback(
		(resourceId: string): number => {
			const v2Value = player.resourceV2?.values?.[resourceId];
			if (typeof v2Value === 'number') {
				return v2Value;
			}
			const legacyValue = player.resources[resourceId];
			if (typeof legacyValue === 'number') {
				return legacyValue;
			}
			return 0;
		},
		[player],
	);
	const resolveForecastDelta = React.useCallback(
		(resourceId: string): number | undefined => {
			const delta = playerForecast.resources[resourceId];
			return typeof delta === 'number' ? delta : undefined;
		},
		[playerForecast],
	);
	const computeParentForecast = React.useCallback(
		(childIds: string[]): number | undefined => {
			let total = 0;
			let hasDelta = false;
			for (const childId of childIds) {
				const delta = resolveForecastDelta(childId);
				if (typeof delta === 'number') {
					total += delta;
					hasDelta = true;
				}
			}
			return hasDelta ? total : undefined;
		},
		[resolveForecastDelta],
	);
	const handleShowParent = React.useCallback(
		(parentId: string) => {
			const info = parentInfo.get(parentId);
			if (!info) {
				return;
			}
			const childSummaries: SummaryGroup[] = info.children.map((child) => ({
				title: formatIconLabel(child),
				items: child.description ? [child.description] : [],
			}));
			const description =
				info.parent.description ?? info.group.description ?? undefined;
			handleHoverCard({
				title: formatIconLabel(info.parent),
				effects: childSummaries,
				requirements: [],
				...(description ? { description } : {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard, parentInfo],
	);
	const handleShowResource = React.useCallback(
		(resourceKey: string) => {
			const descriptor = resourceDescriptorMap.get(resourceKey);
			if (!descriptor) {
				return;
			}
			if (happinessKey && resourceKey === happinessKey) {
				const resourceValue = resolveResourceValue(resourceKey);
				showHappinessCard(resourceValue);
				return;
			}
			handleHoverCard({
				title: formatIconLabel(descriptor),
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
			resourceDescriptorMap,
			resolveResourceValue,
			showHappinessCard,
		],
	);
	const renderResourceEntry = (descriptor: DescriptorDisplay) => {
		const formatters = descriptorFormatters.get(descriptor.id);
		const resourceValue = resolveResourceValue(descriptor.id);
		const forecastDelta = resolveForecastDelta(descriptor.id);
		const buttonProps: ResourceButtonProps = {
			resourceId: descriptor.id,
			label: descriptor.label,
			value: resourceValue,
			onShow: handleShowResource,
			onHide: clearHoverCard,
			...(descriptor.icon !== undefined ? { icon: descriptor.icon } : {}),
			...(forecastDelta !== undefined ? { forecastDelta } : {}),
			...(formatters
				? {
						formatValue: formatters.formatValue,
						formatDelta: formatters.formatDelta,
					}
				: {}),
		};
		return <ResourceButton key={descriptor.id} {...buttonProps} />;
	};
	const renderParentEntry = (group: ResourceGroupEntryDisplay) => {
		const parentDescriptor = group.parentDescriptor;
		if (!parentDescriptor) {
			return null;
		}
		const childIds = group.children.map((child) => child.id);
		const parentValue = childIds.reduce(
			(total, childId) => total + resolveResourceValue(childId),
			0,
		);
		const parentForecast = computeParentForecast(childIds);
		const formatters = descriptorFormatters.get(parentDescriptor.id);
		const buttonProps: ResourceButtonProps = {
			resourceId: parentDescriptor.id,
			label: parentDescriptor.label,
			value: parentValue,
			onShow: handleShowParent,
			onHide: clearHoverCard,
			...(parentDescriptor.icon !== undefined
				? { icon: parentDescriptor.icon }
				: {}),
			...(parentForecast !== undefined
				? { forecastDelta: parentForecast }
				: {}),
			...(formatters
				? {
						formatValue: formatters.formatValue,
						formatDelta: formatters.formatDelta,
					}
				: {}),
		};
		return <ResourceButton key={parentDescriptor.id} {...buttonProps} />;
	};

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
			{displayEntries.map((entry) => {
				if (entry.type === 'group') {
					const { group } = entry;
					const headerProps = group.descriptor.description
						? { title: group.descriptor.description }
						: {};
					return (
						<div
							key={`group-${group.descriptor.id}`}
							className="resource-group"
						>
							<span className="resource-group__header" {...headerProps}>
								{formatIconLabel(group.descriptor)}
							</span>
							<div className="resource-group__items">
								{renderParentEntry(group)}
								{group.children.map((child) => renderResourceEntry(child))}
							</div>
						</div>
					);
				}
				return renderResourceEntry(entry.descriptor);
			})}
		</div>
	);
};

export default ResourceBar;
