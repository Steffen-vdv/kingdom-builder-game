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

const ROLE_BUTTON_CLASSES = [
	'cursor-help rounded-full border border-white/40 bg-white/40 px-2 py-1',
	'text-xs font-semibold text-slate-700 hoverable',
	'dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100',
].join(' ');

function buildBoundResourceMap(
	definitions: readonly SessionResourceDefinition[],
): Map<string, SessionResourceDefinition> {
	const map = new Map<string, SessionResourceDefinition>();
	for (const definition of definitions) {
		if (definition.boundOf) {
			map.set(definition.boundOf.resourceId, definition);
		}
	}
	return map;
}

const ResourceGroupDisplay: React.FC<ResourceGroupDisplayProps> = ({
	groupId,
	player,
	// Note: Category-level filtering is handled by ResourceCategoryRow.
	// This prop is available for future per-resource filtering within groups.
	isPrimaryCategory: _isPrimaryCategory = false,
}) => {
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

	const boundResourceMap = React.useMemo(
		() =>
			resourceCatalog
				? buildBoundResourceMap(resourceCatalog.resources.ordered)
				: new Map<string, SessionResourceDefinition>(),
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
		const boundDef = boundResourceMap.get(groupParentId);
		if (!boundDef) {
			return undefined;
		}
		const metadata = translationContext.resourceMetadata.get(boundDef.id);
		const snapshot = createResourceSnapshot(boundDef.id, snapshotContext);
		return { metadata, snapshot, boundType: boundDef.boundOf?.boundType };
	}, [
		groupParentId,
		boundResourceMap,
		snapshotContext,
		translationContext.resourceMetadata,
	]);

	const groupCardSections = React.useMemo(() => {
		const sections: (string | SummaryGroup)[] = [];
		// Only show children descriptions, not parent value data
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

	const roleButtons = React.useMemo(
		() =>
			groupEntries
				.filter((entry) => entry.snapshot.current > 0)
				.map((entry, index) => {
					const handleRoleFocus = (event: React.SyntheticEvent) => {
						event.stopPropagation();
						showEntryCard(entry);
					};
					const handleRoleLeave = (event: React.SyntheticEvent) => {
						event.stopPropagation();
						showGroupCard();
					};
					return (
						<React.Fragment key={entry.snapshot.id}>
							{index > 0 && ','}
							<button
								type="button"
								className={ROLE_BUTTON_CLASSES}
								onMouseEnter={handleRoleFocus}
								onMouseLeave={handleRoleLeave}
								onFocus={handleRoleFocus}
								onBlur={handleRoleLeave}
								onClick={handleRoleFocus}
								aria-label={`${entry.metadata.label}: ${entry.snapshot.current}`}
							>
								{entry.metadata.icon && (
									<span aria-hidden="true">{entry.metadata.icon}</span>
								)}
								{entry.snapshot.current}
							</button>
						</React.Fragment>
					);
				}),
		[groupEntries, showEntryCard, showGroupCard],
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

	return (
		<div
			role="button"
			tabIndex={0}
			className="bar-item hoverable cursor-help"
			onMouseEnter={showGroupCard}
			onMouseLeave={clearHoverCard}
			onFocus={showGroupCard}
			onBlur={clearHoverCard}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					showGroupCard();
				}
			}}
		>
			{displayMetadata.icon && (
				<span aria-hidden="true">{displayMetadata.icon}</span>
			)}
			{displayValue}
			{roleButtons.length > 0 && (
				<>
					{' ('}
					{roleButtons}
					{')'}
				</>
			)}
		</div>
	);
};

export default ResourceGroupDisplay;
