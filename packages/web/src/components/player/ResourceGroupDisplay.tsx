import React from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import {
	type ResourceMetadataSnapshot,
	type ResourceValueSnapshot,
} from '../../translation';
import { formatResourceMagnitude } from './ResourceButton';
import {
	createForecastMap,
	createResourceSnapshot,
	formatResourceTitle,
	toDescriptorFromMetadata,
} from './resourceSnapshots';
import { PLAYER_INFO_CARD_BG } from './infoCards';
import type { SummaryGroup } from '../../translation/content/types';
import {
	buildBoundReferenceMap,
	type BoundRefEntry,
} from './boundReferenceHelpers';

interface ResourceGroupDisplayProps {
	groupId: string;
	player: SessionPlayerStateSnapshot;
	/**
	 * When true, all resources in this group are always visible.
	 * When false, resources are only shown if touched (value was ever non-zero).
	 */
	isPrimaryCategory?: boolean;
}

interface ResourceEntry {
	metadata: ResourceMetadataSnapshot;
	snapshot: ResourceValueSnapshot;
	definition: SessionResourceDefinition;
}

const ResourceGroupDisplay: React.FC<ResourceGroupDisplayProps> = ({
	groupId,
	player,
	isPrimaryCategory: _isPrimaryCategory = false,
}) => {
	const [expanded, setExpanded] = React.useState(false);
	const { handleHoverCard, clearHoverCard, translationContext } =
		useGameEngine();
	const resourceCatalog = translationContext.resources;
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id];

	const groupDefinition = React.useMemo(
		() => (resourceCatalog ? resourceCatalog.groups.byId[groupId] : undefined),
		[resourceCatalog, groupId],
	);

	const groupResources = React.useMemo(
		() =>
			resourceCatalog
				? resourceCatalog.resources.ordered.filter(
						(definition) => definition.groupId === groupId,
					)
				: [],
		[resourceCatalog, groupId],
	);

	const groupResourceIds = React.useMemo(
		() => groupResources.map((definition) => definition.id),
		[groupResources],
	);

	const groupParentId = groupDefinition?.parent?.id;

	const forecastMap = React.useMemo(
		() => createForecastMap(playerForecast, groupParentId, groupResourceIds),
		[playerForecast, groupParentId, groupResourceIds],
	);

	const snapshotContext = React.useMemo(
		() => ({
			player,
			forecastMap,
			signedGains: translationContext.signedResourceGains,
			populationRoleIds: groupResourceIds,
			...(groupParentId ? { populationParentId: groupParentId } : {}),
		}),
		[
			player,
			forecastMap,
			translationContext.signedResourceGains,
			groupResourceIds,
			groupParentId,
		],
	);

	const boundReferenceMap = React.useMemo(
		() =>
			resourceCatalog
				? buildBoundReferenceMap(
						resourceCatalog.resources.ordered,
						resourceCatalog.groups.ordered,
					)
				: new Map<string, BoundRefEntry>(),
		[resourceCatalog],
	);

	const groupEntries = React.useMemo<ResourceEntry[]>(
		() =>
			groupResources.map((definition) => ({
				definition,
				metadata: translationContext.resourceMetadata.get(definition.id),
				snapshot: createResourceSnapshot(definition.id, snapshotContext),
			})),
		[groupResources, snapshotContext, translationContext.resourceMetadata],
	);

	const groupTotalEntry = React.useMemo(() => {
		if (!groupParentId) {
			return undefined;
		}
		const metadata = translationContext.resourceMetadata.get(groupParentId);
		const snapshot = createResourceSnapshot(groupParentId, snapshotContext);
		return { metadata, snapshot };
	}, [groupParentId, snapshotContext, translationContext.resourceMetadata]);

	const groupMetadataSnapshot = React.useMemo(() => {
		if (!groupDefinition) {
			return undefined;
		}
		const meta = translationContext.resourceGroupMetadata.get(
			groupDefinition.id,
		);
		return meta ? ({ ...meta } as ResourceMetadataSnapshot) : undefined;
	}, [groupDefinition, translationContext.resourceGroupMetadata]);

	const boundEntry = React.useMemo(() => {
		if (!groupParentId) {
			return undefined;
		}
		const boundInfo = boundReferenceMap.get(groupParentId);
		if (!boundInfo) {
			return undefined;
		}
		const metadata = translationContext.resourceMetadata.get(
			boundInfo.boundRef.resourceId,
		);
		const snapshot = createResourceSnapshot(
			boundInfo.boundRef.resourceId,
			snapshotContext,
		);
		return { metadata, snapshot, boundType: boundInfo.boundType };
	}, [
		groupParentId,
		boundReferenceMap,
		snapshotContext,
		translationContext.resourceMetadata,
	]);

	const groupCardSections = React.useMemo(() => {
		const sections: (string | SummaryGroup)[] = [];
		for (const entry of groupEntries) {
			const desc = toDescriptorFromMetadata(entry.metadata);
			const base = [desc.icon, desc.label].filter(Boolean).join(' ').trim();
			sections.push(desc.description ? `${base} - ${desc.description}` : base);
		}
		return sections;
	}, [groupEntries]);

	const showGroupCard = React.useCallback(() => {
		const meta = groupMetadataSnapshot ?? groupTotalEntry?.metadata;
		if (!meta) {
			return;
		}
		handleHoverCard({
			title: formatResourceTitle(meta),
			effects: groupCardSections,
			effectsTitle: groupDefinition?.parent?.label ?? 'Members',
			requirements: [],
			...(meta.description ? { description: meta.description } : {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});
	}, [
		handleHoverCard,
		groupCardSections,
		groupMetadataSnapshot,
		groupTotalEntry,
		groupDefinition,
	]);

	const showEntryCard = React.useCallback(
		(entry: ResourceEntry) => {
			handleHoverCard({
				title: formatResourceTitle(entry.metadata),
				effects: [],
				requirements: [],
				...(entry.metadata.description
					? { description: entry.metadata.description }
					: {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard],
	);

	const displayMetadata =
		groupMetadataSnapshot ??
		groupTotalEntry?.metadata ??
		({ id: groupId, label: 'Group' } as ResourceMetadataSnapshot);

	const totalValue = groupTotalEntry?.snapshot.current ?? 0;
	const boundValue = boundEntry?.snapshot.current ?? null;
	const boundType = boundEntry?.boundType ?? 'upper';

	const formattedTotal = formatResourceMagnitude(totalValue, displayMetadata);
	const formattedBound =
		boundValue !== null
			? formatResourceMagnitude(
					boundValue,
					boundEntry?.metadata ?? displayMetadata,
				)
			: null;

	const displayValue =
		formattedBound !== null
			? boundType === 'upper'
				? `${formattedTotal}/${formattedBound}`
				: `${formattedBound}/${formattedTotal}`
			: formattedTotal;

	// Members with value > 0
	const activeMembers = groupEntries.filter(
		(entry) => entry.snapshot.current > 0,
	);

	const toggleExpanded = () => setExpanded(!expanded);

	return (
		<div
			className={`pop-group${expanded ? ' expanded' : ''}`}
			onMouseEnter={showGroupCard}
			onMouseLeave={clearHoverCard}
		>
			{/* Header row - clickable to expand */}
			<button
				type="button"
				className="pop-header w-full"
				onClick={toggleExpanded}
				aria-expanded={expanded}
				aria-label={`${displayMetadata.label}: ${displayValue}`}
			>
				{displayMetadata.icon && (
					<span className="text-sm" aria-hidden="true">
						{displayMetadata.icon}
					</span>
				)}
				<span className="flex-1 text-left text-sm font-semibold text-slate-100">
					{displayValue}
				</span>
				{activeMembers.length > 0 && (
					<span className="pop-chevron" aria-hidden="true">
						{expanded ? '▼' : '▲'}
					</span>
				)}
			</button>

			{/* Expandable member chips */}
			{activeMembers.length > 0 && (
				<div className="pop-members">
					{activeMembers.map((entry) => {
						const handleMemberEnter = (event: React.SyntheticEvent) => {
							event.stopPropagation();
							showEntryCard(entry);
						};
						const handleMemberLeave = (event: React.SyntheticEvent) => {
							event.stopPropagation();
							showGroupCard();
						};
						return (
							<button
								key={entry.snapshot.id}
								type="button"
								className="mini-chip"
								onMouseEnter={handleMemberEnter}
								onMouseLeave={handleMemberLeave}
								onFocus={handleMemberEnter}
								onBlur={handleMemberLeave}
								aria-label={`${entry.metadata.label}: ${entry.snapshot.current}`}
							>
								{entry.metadata.icon && (
									<span aria-hidden="true">{entry.metadata.icon}</span>
								)}
								<span>{entry.snapshot.current}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default ResourceGroupDisplay;
