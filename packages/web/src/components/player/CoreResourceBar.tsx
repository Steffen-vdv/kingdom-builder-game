import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { getStatBreakdownSummary } from '../../utils/stats';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { GENERAL_CORE_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import {
	buildResourceV2HoverSections,
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../../translation';
import { formatResourceMagnitude } from './ResourceButton';
import CoreResourceButton from './CoreResourceButton';
import {
	createForecastMap,
	createResourceSnapshot,
	formatResourceTitle,
	toDescriptorFromMetadata,
} from './resourceV2Snapshots';
import type { SummaryGroup } from '../../translation/content/types';

const POPULATION_ARCHETYPE_LABEL = 'Archetypes';
const MAX_POPULATION_RESOURCE_ID = 'resource:core:max-population';

const ROLE_BUTTON_CLASSES = [
	'cursor-help rounded-full border border-white/40 bg-white/40 px-2 py-1',
	'text-xs font-semibold text-slate-700 hoverable',
	'dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100',
].join(' ');

interface CoreResourceBarProps {
	player: SessionPlayerStateSnapshot;
}

interface ResourceEntry {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
}

const CoreResourceBar: React.FC<CoreResourceBarProps> = ({ player }) => {
	const { handleHoverCard, clearHoverCard, translationContext } =
		useGameEngine();
	const resourceCatalog = translationContext.resourcesV2;
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id];
	const populationRoleDefinitions = React.useMemo(
		() =>
			resourceCatalog
				? resourceCatalog.resources.ordered.filter(
						(definition) =>
							definition.groupId === 'resource-group:population:roles',
					)
				: [],
		[resourceCatalog],
	);
	const populationRoleIds = React.useMemo(
		() => populationRoleDefinitions.map((definition) => definition.id),
		[populationRoleDefinitions],
	);
	const populationGroupDefinition = React.useMemo(() => {
		if (!resourceCatalog) {
			return undefined;
		}
		for (const definition of populationRoleDefinitions) {
			if (definition.groupId) {
				return resourceCatalog.groups.byId[definition.groupId];
			}
		}
		return undefined;
	}, [populationRoleDefinitions, resourceCatalog]);
	const populationParentId = populationGroupDefinition?.parent?.id;
	const coreResourceDefinitions = React.useMemo(
		() =>
			resourceCatalog
				? resourceCatalog.resources.ordered.filter(
						(definition) => definition.groupId === 'resource-group:stats',
					)
				: [],
		[resourceCatalog],
	);
	const forecastMap = React.useMemo(
		() =>
			createForecastMap(playerForecast, populationParentId, populationRoleIds),
		[playerForecast, populationParentId, populationRoleIds],
	);
	const snapshotContext = React.useMemo(
		() =>
			({
				player,
				forecastMap,
				signedGains: translationContext.signedResourceGains,
				populationRoleIds,
				...(populationParentId ? { populationParentId } : {}),
			}) satisfies Parameters<typeof createResourceSnapshot>[1],
		[
			player,
			forecastMap,
			translationContext.signedResourceGains,
			populationRoleIds,
			populationParentId,
		],
	);
	const populationEntries = React.useMemo<ResourceEntry[]>(
		() =>
			populationRoleDefinitions.map((definition) => ({
				metadata: translationContext.resourceMetadataV2.get(definition.id),
				snapshot: createResourceSnapshot(definition.id, snapshotContext),
			})),
		[
			populationRoleDefinitions,
			snapshotContext,
			translationContext.resourceMetadataV2,
		],
	);
	const coreResourceEntries = React.useMemo<ResourceEntry[]>(
		() =>
			coreResourceDefinitions.map((definition) => ({
				metadata: translationContext.resourceMetadataV2.get(definition.id),
				snapshot: createResourceSnapshot(definition.id, snapshotContext),
			})),
		[
			coreResourceDefinitions,
			snapshotContext,
			translationContext.resourceMetadataV2,
		],
	);
	const coreResourceEntryMap = React.useMemo(
		() =>
			new Map(
				coreResourceEntries.map((entry) => [entry.snapshot.id, entry] as const),
			),
		[coreResourceEntries],
	);
	const populationTotalEntry = React.useMemo(() => {
		if (!populationParentId) {
			return undefined;
		}
		const metadata =
			translationContext.resourceMetadataV2.get(populationParentId);
		const snapshot = createResourceSnapshot(
			populationParentId,
			snapshotContext,
		);
		return { metadata, snapshot } satisfies ResourceEntry;
	}, [
		populationParentId,
		snapshotContext,
		translationContext.resourceMetadataV2,
	]);
	const populationGroupMetadataSnapshot = React.useMemo(() => {
		if (!populationGroupDefinition) {
			return undefined;
		}
		const meta = translationContext.resourceGroupMetadataV2.get(
			populationGroupDefinition.id,
		);
		return meta ? ({ ...meta } as ResourceV2MetadataSnapshot) : undefined;
	}, [populationGroupDefinition, translationContext.resourceGroupMetadataV2]);
	const populationCardSections = React.useMemo(() => {
		const sections: (string | SummaryGroup)[] = [];
		if (populationTotalEntry) {
			sections.push(
				...buildResourceV2HoverSections(
					populationTotalEntry.metadata,
					populationTotalEntry.snapshot,
				),
			);
		}
		for (const entry of populationEntries) {
			const desc = toDescriptorFromMetadata(entry.metadata);
			const base = [desc.icon, desc.label].filter(Boolean).join(' ').trim();
			sections.push(desc.description ? `${base} - ${desc.description}` : base);
		}
		return sections;
	}, [populationEntries, populationTotalEntry]);
	const showPopulationCard = React.useCallback(() => {
		const meta =
			populationGroupMetadataSnapshot ?? populationTotalEntry?.metadata;
		if (!meta) {
			return;
		}
		handleHoverCard({
			title: formatResourceTitle(meta),
			effects: populationCardSections,
			effectsTitle: POPULATION_ARCHETYPE_LABEL,
			requirements: [],
			...(meta.description ? { description: meta.description } : {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});
	}, [
		handleHoverCard,
		populationCardSections,
		populationGroupMetadataSnapshot,
		populationTotalEntry,
	]);
	const populationRoleButtons = React.useMemo(
		() =>
			populationEntries
				.filter((entry) => entry.snapshot.current > 0)
				.map((entry, index) => {
					const handleRoleFocus = (event: React.SyntheticEvent) => {
						event.stopPropagation();
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
					};
					const handleRoleLeave = (event: React.SyntheticEvent) => {
						event.stopPropagation();
						showPopulationCard();
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
		[handleHoverCard, populationEntries, showPopulationCard],
	);
	const showOverviewCard = () =>
		handleHoverCard({
			title: `${GENERAL_CORE_RESOURCE_INFO.icon} ${GENERAL_CORE_RESOURCE_INFO.label}`,
			effects: [],
			requirements: [],
			description: GENERAL_CORE_RESOURCE_INFO.description,
			bgClass: PLAYER_INFO_CARD_BG,
		});
	const showCoreResourceCard = React.useCallback(
		(resourceId: string) => {
			const entry = coreResourceEntryMap.get(resourceId);
			if (!entry) {
				return;
			}
			// Use V2 resourceId directly - resourceSources is keyed by V2 IDs
			const breakdown = getStatBreakdownSummary(
				resourceId,
				player,
				translationContext,
			);
			const sections = buildResourceV2HoverSections(
				entry.metadata,
				entry.snapshot,
			);
			const effects = breakdown.length
				? ([...sections, { title: 'Breakdown', items: breakdown }] as (
						| string
						| SummaryGroup
					)[])
				: sections;
			handleHoverCard({
				title: formatResourceTitle(entry.metadata),
				effects,
				requirements: [],
				...(entry.metadata.description
					? { description: entry.metadata.description }
					: {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard, player, coreResourceEntryMap, translationContext],
	);
	const populationTotal = populationTotalEntry?.snapshot.current ?? 0;
	const maxPopulationEntry = coreResourceEntryMap.get(
		MAX_POPULATION_RESOURCE_ID,
	);
	const maxPopulation = maxPopulationEntry?.snapshot.current ?? 0;
	const populationDisplayMetadata =
		populationTotalEntry?.metadata ??
		populationGroupMetadataSnapshot ??
		({
			id: populationParentId ?? 'population',
			label: 'Population',
		} as ResourceV2MetadataSnapshot);
	const maxPopulationMetadata =
		maxPopulationEntry?.metadata ?? populationDisplayMetadata;
	const coreResourceEntriesForDisplay = coreResourceEntries.filter(
		(entry) => entry.snapshot.id !== MAX_POPULATION_RESOURCE_ID,
	);

	return (
		<div className="info-bar core-resource-bar">
			<button
				type="button"
				className="info-bar__icon hoverable cursor-help"
				aria-label={`${GENERAL_CORE_RESOURCE_INFO.label} overview`}
				onMouseEnter={showOverviewCard}
				onMouseLeave={clearHoverCard}
				onFocus={showOverviewCard}
				onBlur={clearHoverCard}
				onClick={showOverviewCard}
			>
				{GENERAL_CORE_RESOURCE_INFO.icon}
			</button>
			<div
				role="button"
				tabIndex={0}
				className="bar-item hoverable cursor-help"
				onMouseEnter={showPopulationCard}
				onMouseLeave={clearHoverCard}
				onFocus={showPopulationCard}
				onBlur={clearHoverCard}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						showPopulationCard();
					}
				}}
			>
				{populationDisplayMetadata.icon && (
					<span aria-hidden="true">{populationDisplayMetadata.icon}</span>
				)}
				{`${formatResourceMagnitude(
					populationTotal,
					populationDisplayMetadata,
				)}/${formatResourceMagnitude(maxPopulation, maxPopulationMetadata)}`}
				{populationRoleButtons.length > 0 && (
					<>
						{' ('}
						{populationRoleButtons}
						{')'}
					</>
				)}
			</div>
			{coreResourceEntriesForDisplay.map((entry) => (
				<CoreResourceButton
					key={entry.snapshot.id}
					metadata={entry.metadata}
					snapshot={entry.snapshot}
					onShow={showCoreResourceCard}
					onHide={clearHoverCard}
				/>
			))}
		</div>
	);
};

export default CoreResourceBar;
