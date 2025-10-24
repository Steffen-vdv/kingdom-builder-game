import React from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceTierDefinitionV2,
	SessionResourceTierTrackV2,
} from '@kingdom-builder/protocol';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { GENERAL_RESOURCE_ICON } from '../../icons';
import { GENERAL_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import ResourceButton from './ResourceButton';
import {
	buildResourceV2DisplayBuckets,
	createLabelResolver,
	type ResourceV2DisplayEntry,
} from './resourceV2Display';
import { buildResourceV2HoverSections } from '../../translation/resourceV2';
import type { ResourceV2MetadataSnapshot } from '../../translation/resourceV2';
import type { SummaryGroup } from '../../translation/content/types';
import { useResourceMetadata } from '../../contexts/RegistryMetadataContext';

interface ResourceBarProps {
	player: SessionPlayerStateSnapshot;
}

function formatIconLabel(
	icon: string | undefined,
	label: string | undefined,
	fallback: string,
): string {
	const resolvedLabel = (label ?? fallback).trim();
	if (icon && icon.trim().length > 0) {
		return `${icon} ${resolvedLabel}`.trim();
	}
	return resolvedLabel;
}

function formatMetadataLabel(metadata: ResourceV2MetadataSnapshot): string {
	return formatIconLabel(metadata.icon, metadata.label, metadata.id);
}

function formatTrackLabel(
	track: SessionResourceTierTrackV2 | undefined,
): string {
	if (!track) {
		return 'Tier Track';
	}
	return formatIconLabel(
		track.metadata.icon,
		track.metadata.label,
		track.metadata.id,
	);
}

function formatThreshold(
	threshold: SessionResourceTierDefinitionV2['threshold'],
): string {
	const { min, max } = threshold;
	if (min !== null && max !== null) {
		if (min === max) {
			return `${min}`;
		}
		return `${min}–${max}`;
	}
	if (min !== null) {
		return `${min}+`;
	}
	if (max !== null) {
		return `≤${max}`;
	}
	return '';
}

function isWithinThreshold(
	threshold: SessionResourceTierDefinitionV2['threshold'],
	value: number,
): boolean {
	if (threshold.min !== null && value < threshold.min) {
		return false;
	}
	if (threshold.max !== null && value > threshold.max) {
		return false;
	}
	return true;
}

function buildTierSummaryGroups(entry: ResourceV2DisplayEntry): SummaryGroup[] {
	const track = entry.definition.tierTrack;
	if (!track || track.tiers.length === 0) {
		return [];
	}
	const groups: SummaryGroup[] = [];
	const description = track.metadata.description?.trim();
	if (description) {
		groups.push({
			title: formatTrackLabel(track),
			items: [description],
			_hoist: true,
		});
	}
	const tiers = [...track.tiers].sort(
		(left, right) => left.resolvedOrder - right.resolvedOrder,
	);
	const activeIndex = tiers.findIndex((tier) =>
		isWithinThreshold(tier.threshold, entry.snapshot.current),
	);
	const pushTier = (
		tier: SessionResourceTierDefinitionV2,
		isActive: boolean,
	) => {
		const titleParts = [tier.icon, tier.label]
			.filter((part) => typeof part === 'string' && part.trim().length > 0)
			.join(' ')
			.trim();
		const range = formatThreshold(tier.threshold);
		const title =
			range.length > 0 ? `${titleParts} (${range})`.trim() : titleParts;
		const detail = tier.description?.trim();
		const items = detail
			? detail
					.split(/\r?\n/u)
					.map((line) => line.trim())
					.filter((line) => line.length > 0)
			: ['No effect'];
		const group: SummaryGroup = { title, items };
		if (isActive) {
			group.className = 'text-emerald-600 dark:text-emerald-300';
		}
		groups.push(group);
	};
	if (activeIndex > 0) {
		const previousTier = tiers[activeIndex - 1];
		if (previousTier) {
			pushTier(previousTier, false);
		}
	}
	if (activeIndex >= 0) {
		const activeTier = tiers[activeIndex];
		if (activeTier) {
			pushTier(activeTier, true);
		}
	} else {
		groups.push({ title: 'No active tier', items: [] });
		const firstTier = tiers[0];
		if (firstTier) {
			pushTier(firstTier, false);
		}
	}
	if (activeIndex >= 0 && activeIndex + 1 < tiers.length) {
		const nextTier = tiers[activeIndex + 1];
		if (nextTier) {
			pushTier(nextTier, false);
		}
	}
	return groups;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
	const { translationContext, handleHoverCard, clearHoverCard } =
		useGameEngine();
	const resourceMetadata = useResourceMetadata();
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id];

	const resourceResolver = React.useMemo(
		() => createLabelResolver(resourceMetadata.list),
		[resourceMetadata],
	);

	const displayBuckets = React.useMemo(
		() =>
			buildResourceV2DisplayBuckets({
				catalog: translationContext.resourcesV2,
				metadata: translationContext.resourceMetadataV2,
				groupMetadata: translationContext.resourceGroupMetadataV2,
				player,
				forecast: playerForecast,
				signedGains: translationContext.signedResourceGains,
				legacyResolvers: {
					resources: resourceResolver,
				},
			}),
		[
			player,
			playerForecast,
			resourceResolver,
			translationContext.resourceGroupMetadataV2,
			translationContext.resourceMetadataV2,
			translationContext.resourcesV2,
			translationContext.signedResourceGains,
		],
	);

	const showGeneralResourceCard = React.useCallback(() => {
		handleHoverCard({
			title: `${GENERAL_RESOURCE_INFO.icon} ${GENERAL_RESOURCE_INFO.label}`,
			effects: [],
			requirements: [],
			...(GENERAL_RESOURCE_INFO.description
				? { description: GENERAL_RESOURCE_INFO.description }
				: {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});
	}, [handleHoverCard]);

	const handleShowResource = React.useCallback(
		(entry: ResourceV2DisplayEntry) => {
			const valueSections = buildResourceV2HoverSections(
				entry.metadata,
				entry.snapshot,
			);
			const tierSections = buildTierSummaryGroups(entry);
			const effects = [...valueSections, ...tierSections];
			handleHoverCard({
				title: formatMetadataLabel(entry.metadata),
				effects,
				requirements: [],
				...(entry.metadata.description
					? { description: entry.metadata.description }
					: {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard],
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
			{displayBuckets.resources.map((entry) => (
				<ResourceButton
					key={entry.id}
					metadata={entry.metadata}
					snapshot={entry.snapshot}
					onShow={() => handleShowResource(entry)}
					onHide={clearHoverCard}
				/>
			))}
		</div>
	);
};

export default ResourceBar;
